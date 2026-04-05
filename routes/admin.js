const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Project = require("../models/project");
const config_passport = require("../config/passport.js");
const moment = require("moment");
const Leave = require("../models/leave");
const Attendance = require("../models/attendance");
const UserSalary = require("../models/user_salary");
const { isLoggedIn } = require("./middleware");
const { Op } = require("sequelize");

async function buildPayrollRows(users, operatorId, year, month) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows = [];

  for (const user of users) {
    let salaryRecord = await UserSalary.findOne({ where: { employeeID: user.id } });

    if (!salaryRecord) {
      salaryRecord = await UserSalary.create({
        accountManagerID: operatorId,
        employeeID: user.id,
        salary: 0,
        bonus: 0,
        reasonForBonus: "N/A",
      });
    }

    const workingDays = await Attendance.count({
      where: {
        employeeID: user.id,
        year,
        month,
        present: 1,
      },
    });

    const leaves = await Leave.findAll({ where: { applicantID: user.id } });
    const leavesInMonth = leaves.filter((leave) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      return leaveStart <= monthEnd && leaveEnd >= monthStart;
    });

    const approvedLeaveDays = leavesInMonth
      .filter((leave) => leave.adminResponse === "Approved")
      .reduce((sum, leave) => sum + Number(leave.period || 0), 0);

    const unauthorizedLeaveDays = leavesInMonth
      .filter((leave) => leave.adminResponse !== "Approved")
      .reduce((sum, leave) => sum + Number(leave.period || 0), 0);

    const baseSalary = Number(salaryRecord.salary || 0);
    const bonus = Number(salaryRecord.bonus || 0);
    const dailyRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0;
    const unauthorizedDeduction = dailyRate * unauthorizedLeaveDays;
    const netSalary = baseSalary + bonus - unauthorizedDeduction;

    rows.push({
      user,
      salaryRecord,
      workingDays,
      approvedLeaveDays,
      unauthorizedLeaveDays,
      netSalary: netSalary.toFixed(2),
    });
  }

  return rows;
}

router.use("/", isLoggedIn, function isAuthenticated(req, res, next) {
  next();
});

// Displays home page to the admin
router.get("/", function viewHome(req, res, next) {
  res.render("Admin/adminHome", {
    title: "Admin Home",
    csrfToken: req.csrfToken(),
    userName: req.user.name,
  });
});

/**
 * Sorts the list of employees in User Schema.
 * Such that latest records are shown first.
 * Then displays list of all employees to the admin.
 */
router.get("/view-all-employees", async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { type: "employee" },
          { type: "project_manager" },
          { type: "accounts_manager" },
        ],
      },
      order: [['id', 'DESC']],
    });

    res.render("Admin/viewAllEmployee", {
      title: "All Employees",
      csrfToken: req.csrfToken(),
      users,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employees");
  }
});

router.get("/salary-board", async (req, res, next) => {
  const now = new Date();
  const month = Math.min(Math.max(Number(req.query.month || now.getMonth() + 1), 1), 12);
  const year = Math.min(Math.max(Number(req.query.year || now.getFullYear()), 2000), 2100);

  try {
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { type: "employee" },
          { type: "project_manager" },
          { type: "accounts_manager" },
        ],
      },
      order: [["id", "DESC"]],
    });

    const payrollRows = await buildPayrollRows(users, req.user.id, year, month);

    res.render("Admin/salaryBoard", {
      title: "Salary Board",
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      month,
      year,
      payrollRows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving salary board");
  }
});

router.post("/salary-board/update/:employeeId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const month = Number(req.body.month || new Date().getMonth() + 1);
  const year = Number(req.body.year || new Date().getFullYear());
  const baseSalary = Number(req.body.salary || 0);
  const bonus = Number(req.body.bonus || 0);
  const reasonForBonus = (req.body.reasonForBonus || "N/A").trim() || "N/A";

  try {
    const employee = await User.findByPk(employeeId);
    if (!employee) {
      return res.status(404).send("Employee not found");
    }

    let salaryRecord = await UserSalary.findOne({ where: { employeeID: employeeId } });

    if (!salaryRecord) {
      salaryRecord = await UserSalary.create({
        accountManagerID: req.user.id,
        employeeID: employeeId,
        salary: baseSalary,
        bonus,
        reasonForBonus,
      });
    } else {
      await salaryRecord.update({
        accountManagerID: req.user.id,
        salary: baseSalary,
        bonus,
        reasonForBonus,
      });
    }

    res.redirect(`/admin/salary-board?month=${month}&year=${year}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating salary");
  }
});

// Displays profile of the employee with the help of the id of the employee from the parameters.
router.get("/employee-profile/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    res.render("Admin/employeeProfile", {
      title: "Employee Profile",
      employee: user,
      csrfToken: req.csrfToken(),
      moment: moment,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee profile");
  }
});

// Displays the attendance sheet of the given employee to the admin.
router.get("/view-employee-attendance/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const attendances = await Attendance.findAll({
      where: { employeeID: id },
      order: [['id', 'DESC']],
    });
    const user = await User.findByPk(id);

    res.render("Admin/employeeAttendanceSheet", {
      title: "Employee Attendance Sheet",
      month: req.body.month,
      csrfToken: req.csrfToken(),
      found: attendances.length > 0 ? 1 : 0,
      attendance: attendances,
      moment: moment,
      userName: req.user.name,
      employee_name: user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee attendance");
  }
});

// Displays edit employee form to the admin.
router.get("/edit-employee/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    res.render("Admin/editEmployee", {
      title: "Edit Employee",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      message: "",
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/");
  }
});

// First it gets attributes of the logged in admin from the User Schema.
router.get("/view-profile", async (req, res, next) => {
  const { id, name } = req.user;
  try {
    const user = await User.findByPk(id);
    res.render("Admin/viewProfile", {
      title: "Profile",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      userName: name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving profile");
  }
});

// Displays add employee form to the admin.
router.get("/add-employee", (req, res, next) => {
  const { name } = req.user;
  const messages = req.flash("error");

  res.render("Admin/addEmployee", {
    title: "Add Employee",
    csrfToken: req.csrfToken(),
    user: config_passport.User,
    messages,
    hasErrors: messages.length > 0,
    userName: name,
  });
});

/**
 * First it gets the id of the given employee from the parameters.
 * Finds the project of the employee from Project Schema with the help of that id.
 * Then displays all the projects of the given employee.
 */
router.get("/all-employee-projects/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const projects = await Project.findAll({
      where: { employeeID: id },
      order: [['id', 'DESC']],
    });
    const user = await User.findByPk(id);

    res.render("Admin/employeeAllProjects", {
      title: "List Of Employee Projects",
      hasProject: projects.length > 0 ? 1 : 0,
      projects,
      csrfToken: req.csrfToken(),
      user,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee projects");
  }
});

// Displays the list of all the leave applications applied by all employees.
router.get("/leave-applications", async (req, res, next) => {
  try {
    const leaves = await Leave.findAll({
      order: [['id', 'DESC']],
    });
    const hasLeave = leaves.length > 0 ? 1 : 0;

    const employeeChunks = await Promise.all(
      leaves.map((leave) => User.findByPk(leave.applicantID))
    );

    res.render("Admin/allApplications", {
      title: "List Of Leave Applications",
      csrfToken: req.csrfToken(),
      hasLeave,
      leaves,
      employees: employeeChunks,
      moment: moment,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving leave applications");
  }
});

/**
 * Gets the leave id and employee id from the parameters.
 * Then shows the response application form of that leave of the employee to the admin.
 */
router.get(
  "/respond-application/:leave_id/:employee_id",
  async (req, res, next) => {
    const { leave_id: leaveID, employee_id: employeeID } = req.params;
    try {
      const leave = await Leave.findByPk(leaveID);
      const user = await User.findByPk(employeeID);

      res.render("Admin/applicationResponse", {
        title: "Respond Leave Application",
        csrfToken: req.csrfToken(),
        leave,
        employee: user,
        moment: moment,
        userName: req.user.name,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error responding to application");
    }
  }
);

/**
 * Gets id of the projet to be edit.
 * Displays the form of the edit project to th admin.
 */
router.get("/edit-employee-project/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const project = await Project.findByPk(id);
    res.render("Admin/editProject", {
      title: "Edit Employee",
      csrfToken: req.csrfToken(),
      project,
      moment: moment,
      message: "",
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving project");
  }
});

/**
 * Gets the id of the employee from parameters.
 * Displays the add employee project form to the admin.
 */
router.get("/add-employee-project/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    res.render("Admin/addProject", {
      title: "Add Employee Project",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      message: "",
      userName: req.user.name,
    });
  } catch (err) {
    res.redirect("/admin/");
  }
});

router.get("/employee-project-info/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const project = await Project.findByPk(id);
    const user = await User.findByPk(project.employeeID);
    res.render("Admin/projectInfo", {
      title: "Employee Project Information",
      project: project,
      employee: user,
      moment: moment,
      message: "",
      userName: req.user.name,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
  }
});

router.get("/redirect-employee-profile", async (req, res, next) => {
  const { id } = req.user;
  try {
    const user = await User.findByPk(id);
    res.redirect(`/admin/employee-profile/${id}`);
  } catch (err) {
    console.log(err);
  }
});

// Displays the admin its own attendance sheet
router.post("/view-attendance", async (req, res, next) => {
  const { month, year } = req.body;
  const { id, name } = req.user;
  try {
    const attendance = await Attendance.findAll({
      where: {
        employeeID: id,
        month,
        year,
      },
      order: [['id', 'DESC']],
    });
    const found = attendance.length > 0 ? 1 : 0;
    res.render("Admin/viewAttendanceSheet", {
      title: "Attendance Sheet",
      month,
      csrfToken: req.csrfToken(),
      found,
      attendance,
      userName: name,
      moment: moment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error viewing attendance");
  }
});

/**
 * After marking attendance.
 * Shows current attendance to the admin.
 */
router.get("/view-attendance-current", async (req, res, next) => {
  const { id, name } = req.user;
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  try {
    const attendance = await Attendance.findAll({
      where: {
        employeeID: id,
        month,
        year,
      },
      order: [['id', 'DESC']],
    });
    const found = attendance.length > 0 ? 1 : 0;
    res.render("Admin/viewAttendanceSheet", {
      title: "Attendance Sheet",
      month,
      csrfToken: req.csrfToken(),
      found,
      attendance,
      moment: moment,
      userName: name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error viewing current attendance");
  }
});

// Adds employee to the User Schema by getting attributes from the body of the post request.
// Then redirects admin to the profile information page of the added employee.
router.post(
  "/add-employee",
  passport.authenticate("local.add-employee", {
    successRedirect: "/admin/redirect-employee-profile",
    failureRedirect: "/admin/add-employee",
    failureFlash: true,
  })
);

// Gets the id of the leave from the body of the post request.
// Sets the response field of that leave according to response given by employee from body of the post request.
router.post("/respond-application", async (req, res) => {
  try {
    const leave = await Leave.findByPk(req.body.leave_id);
    await leave.update({ adminResponse: req.body.status });
    res.redirect("/admin/leave-applications");
  } catch (err) {
    console.log(err);
  }
});

// Gets the id of the employee from the parameters.
// Gets the edited fields of the project from body of the post request.
// Saves the update field to the project of the employee  in Project Schema.
// Edits the project of the employee.
router.post("/edit-employee/:id", async (req, res) => {
  const { id } = req.params;
  const { email, designation, name, DOB, number, department, skills } =
    req.body;
  const newUser = {
    email,
    type:
      designation === "Accounts Manager"
        ? "accounts_manager"
        : designation === "Project Manager"
        ? "project_manager"
        : "employee",
    name,
    dateOfBirth: new Date(DOB),
    contactNumber: number,
    department,
    Skills: skills,
    designation,
  };

  try {
    const user = await User.findByPk(id);
    if (user.email !== email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.render("Admin/editEmployee", {
          title: "Edit Employee",
          csrfToken: req.csrfToken(),
          employee: newUser,
          moment: moment,
          message: "Email is already in use",
          userName: req.user.name,
        });
      }
    }
    Object.assign(user, newUser);
    await user.update(newUser);
    res.redirect(`/admin/employee-profile/${id}`);
  } catch (err) {
    console.log(err);
    res.redirect("/admin/");
  }
});

router.post("/add-employee-project/:id", async (req, res) => {
  const { id } = req.params;
  const { title, type, start_date, end_date, description, status } = req.body;
  const newProject = {
    employeeID: id,
    title,
    type,
    startDate: new Date(start_date),
    endDate: new Date(end_date),
    description,
    status,
  };

  try {
    const createdProject = await Project.create(newProject);
    res.redirect(`/admin/employee-project-info/${createdProject.id}`);
  } catch (err) {
    console.log(err);
  }
});

router.post("/edit-employee-project/:id", async (req, res) => {
  const { id } = req.params;
  const { title, type, start_date, end_date, description, status } = req.body;

  try {
    const project = await Project.findByPk(id);
    await project.update({
      title,
      type,
      startDate: new Date(start_date),
      endDate: new Date(end_date),
      description,
      status,
    });
    res.redirect(`/admin/employee-project-info/${id}`);
  } catch (err) {
    console.log(err);
  }
});

router.post("/delete-employee/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await User.destroy({ where: { id: id } });
    res.redirect("/admin/view-all-employees");
  } catch (err) {
    console.log("unable to delete employee");
  }
});

router.post("/mark-attendance", async (req, res) => {
  const { id } = req.user;
  const currentDate = new Date();
  const date = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  try {
    const attendance = await Attendance.findAll({
      where: {
        employeeID: id,
        date,
        month,
        year,
      },
    });

    if (attendance.length === 0) {
      const newAttendance = {
        employeeID: id,
        year,
        month,
        date,
        present: 1,
      };
      await Attendance.create(newAttendance);
    }

    res.redirect("/admin/view-attendance-current");
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
