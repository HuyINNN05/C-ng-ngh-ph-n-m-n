var express = require("express");
var router = express.Router();
var Leave = require("../models/leave");
var Attendance = require("../models/attendance");
var Project = require("../models/project");
var moment = require("moment");
var User = require("../models/user");
var UserSalary = require("../models/user_salary");
const { Op } = require("sequelize");
const { isLoggedIn } = require("./middleware");

router.use("/", isLoggedIn, function checkAuthentication(req, res, next) {
  next();
});

/**
 * Displays home page to the employee.
 */
router.get("/", function viewHome(req, res, next) {
  res.render("Employee/employeeHome", {
    title: "Home",
    userName: req.user.name,
    csrfToken: req.csrfToken(),
  });
});

/**
 * Displays leave application form to the user.
 */

router.get("/apply-for-leave", function applyForLeave(req, res, next) {
  res.render("Employee/applyForLeave", {
    title: "Apply for Leave",
    csrfToken: req.csrfToken(),
    userName: req.user.name,
  });
});

/**
 * Displays the list of all applied laves of the user.
 */

router.get("/applied-leaves", async (req, res, next) => {
  try {
    const leaves = await Leave.findAll({
      where: { applicantID: req.user.id },
      order: [['id', 'DESC']],
    });
    const hasLeave = leaves.length > 0 ? 1 : 0;

    res.render("Employee/appliedLeaves", {
      title: "List Of Applied Leaves",
      csrfToken: req.csrfToken(),
      hasLeave: hasLeave,
      leaves: leaves,
      userName: req.user.name,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving leaves");
  }
});

/**
 * Displays the attendance to the user.
 */

router.post("/view-attendance", async (req, res, next) => {
  try {
    const attendances = await Attendance.findAll({
      where: {
        employeeID: req.user.id,
        month: req.body.month,
        year: req.body.year,
      },
      order: [['id', 'DESC']],
    });
    const found = attendances.length > 0 ? 1 : 0;

    res.render("Employee/viewAttendance", {
      title: "Attendance Sheet",
      month: req.body.month,
      csrfToken: req.csrfToken(),
      found: found,
      attendance: attendances,
      moment: moment,
      userName: req.user.name,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving attendance");
  }
});

/**
 * Display currently marked attendance to the user.
 */

router.get(
  "/view-attendance-current",
  async (req, res, next) => {
    try {
      const attendances = await Attendance.findAll({
        where: {
          employeeID: req.user.id,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        },
        order: [['id', 'DESC']],
      });
      const found = attendances.length > 0 ? 1 : 0;

      res.render("Employee/viewAttendance", {
        title: "Attendance Sheet",
        month: new Date().getMonth() + 1,
        csrfToken: req.csrfToken(),
        found: found,
        attendance: attendances,
        moment: moment,
        userName: req.user.name,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error retrieving current attendance");
    }
  }
);

/**
 * Displays employee his/her profile.
 */

router.get("/view-profile", async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.render("Employee/viewProfile", {
      title: "Profile",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      userName: req.user.name,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving profile");
  }
});

/**
 * Displays the list of all the projects to the Project Schema.
 */

router.get("/view-all-projects", async (req, res, next) => {
  try {
    const projects = await Project.findAll({
      where: { employeeID: req.user.id },
      order: [['id', 'DESC']],
    });
    const hasProject = projects.length > 0 ? 1 : 0;

    res.render("Employee/viewPersonalProjects", {
      title: "List Of Projects",
      hasProject: hasProject,
      projects: projects,
      csrfToken: req.csrfToken(),
      userName: req.user.name,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving projects");
  }
});

router.get("/salary", async (req, res, next) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  try {
    let salaryRecord = await UserSalary.findOne({
      where: { employeeID: req.user.id },
    });

    if (!salaryRecord) {
      salaryRecord = await UserSalary.create({
        accountManagerID: req.user.id,
        employeeID: req.user.id,
        salary: 0,
        bonus: 0,
        reasonForBonus: "N/A",
      });
    }

    const attendanceDays = await Attendance.count({
      where: {
        employeeID: req.user.id,
        year: currentYear,
        month: currentMonth,
        present: 1,
      },
    });

    const leaves = await Leave.findAll({
      where: {
        applicantID: req.user.id,
      },
    });

    const leavesInCurrentMonth = leaves.filter((leave) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      return leaveStart <= monthEnd && leaveEnd >= monthStart;
    });

    const approvedLeaveDays = leavesInCurrentMonth
      .filter((leave) => leave.adminResponse === "Approved")
      .reduce((sum, leave) => sum + Number(leave.period || 0), 0);

    const unauthorizedLeaveDays = leavesInCurrentMonth
      .filter((leave) => leave.adminResponse !== "Approved")
      .reduce((sum, leave) => sum + Number(leave.period || 0), 0);

    const baseSalary = Number(salaryRecord.salary || 0);
    const bonus = Number(salaryRecord.bonus || 0);
    const dailyRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0;
    const unauthorizedDeduction = dailyRate * unauthorizedLeaveDays;
    const netSalary = baseSalary + bonus - unauthorizedDeduction;

    res.render("Employee/viewSalary", {
      title: "Salary",
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      month: currentMonth,
      year: currentYear,
      payroll: {
        baseSalary: baseSalary.toFixed(2),
        bonus: bonus.toFixed(2),
        reasonForBonus: salaryRecord.reasonForBonus || "N/A",
        workingDays: attendanceDays,
        approvedLeaveDays,
        unauthorizedLeaveDays,
        netSalary: netSalary.toFixed(2),
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving salary");
  }
});

/**
 * Displays the employee his/her project infomation by
 * getting project id from the request parameters.
 */

router.get("/view-project/:project_id", async (req, res, next) => {
  const projectId = req.params.project_id;
  try {
    const project = await Project.findByPk(projectId);
    res.render("Employee/viewProject", {
      title: "Project Details",
      project: project,
      csrfToken: req.csrfToken(),
      moment: moment,
      userName: req.user.name,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving project");
  }
});

/**
 * Saves the applied leave application form in Leave Schema.
 */

router.post("/apply-for-leave", async (req, res, next) => {
  try {
    const newLeave = {
      applicantID: req.user.id,
      title: req.body.title,
      type: req.body.type,
      startDate: new Date(req.body.start_date),
      endDate: new Date(req.body.end_date),
      period: req.body.period,
      reason: req.body.reason,
      appliedDate: new Date(),
      adminResponse: "Pending",
    };
    await Leave.create(newLeave);
    res.redirect("/employee/applied-leaves");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error applying for leave");
  }
});

/**
 * Marks the attendance of the employee in Attendance Schema
 */

router.post(
  "/mark-employee-attendance",
  async (req, res, next) => {
    try {
      const attendances = await Attendance.findAll({
        where: {
          employeeID: req.user.id,
          month: new Date().getMonth() + 1,
          date: new Date().getDate(),
          year: new Date().getFullYear(),
        },
      });

      if (attendances.length === 0) {
        const newAttendance = {
          employeeID: req.user.id,
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          date: new Date().getDate(),
          present: 1,
        };
        await Attendance.create(newAttendance);
      }

      res.redirect("/employee/view-attendance-current");
    } catch (err) {
      console.log(err);
      res.status(500).send("Error marking attendance");
    }
  }
);
module.exports = router;
