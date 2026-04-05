var express = require("express");
var router = express.Router();
var User = require("../models/user");
var UserSalary = require("../models/user_salary");
var PaySlip = require("../models/payslip");
var Leave = require("../models/leave");
var Attendance = require("../models/attendance");
var moment = require("moment");
var Project = require("../models/project");
var PerformanceAppraisal = require("../models/performance_appraisal");
const { Op } = require("sequelize");
const { isLoggedIn } = require("./middleware");

router.use("/", isLoggedIn, function checkAuthentication(req, res, next) {
  next();
});

/**
 * Displays home to the manager
 */

router.get("/", function viewHomePage(req, res, next) {
  res.render("Manager/managerHome", {
    title: "Manager Home",
    csrfToken: req.csrfToken(),
    userName: req.user.name,
  });
});

/**
 * Checks which type of manager is logged in.
 * Displays the list of employees to the manager respectively.
 * In case of accounts manager checks if user has entry in UserSalary Schema.
 * Then it enters the data in UserSalary Schema if user is not present.
 * Otherwise gets the data from UserSalary Schema and shows the salary of the employees to the accounts manager
 */

router.get("/view-employees", async (req, res) => {
  try {
    if (req.user.type === "project_manager") {
      const users = await User.findAll({
        where: { type: "employee" },
        order: [['id', 'DESC']],
      });

      res.render("Manager/viewemp_project", {
        title: "List Of Employees",
        csrfToken: req.csrfToken(),
        users: users,
        errors: 0,
        userName: req.user.name,
      });
    } else if (req.user.type === "accounts_manager") {
      const users = await User.findAll({
        where: {
          [Op.or]: [
            { type: "employee" },
            { type: "project_manager" }
          ],
        },
        order: [['id', 'DESC']],
      });

      const salaryChunks = [];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      for (let i = 0; i < users.length; i++) {
        const existingSalary = await UserSalary.findOne({
          where: { employeeID: users[i].id },
        });

        const attendanceDays = await Attendance.count({
          where: {
            employeeID: users[i].id,
            year: currentYear,
            month: currentMonth,
            present: 1,
          },
        });

        const leaves = await Leave.findAll({
          where: {
            applicantID: users[i].id,
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

        if (existingSalary) {
          const baseSalary = Number(existingSalary.salary || 0);
          const bonus = Number(existingSalary.bonus || 0);
          const dailyRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0;
          const unauthorizedDeduction = dailyRate * unauthorizedLeaveDays;

          salaryChunks.push({
            ...existingSalary.toJSON(),
            workingDays: attendanceDays,
            approvedLeaveDays,
            unauthorizedLeaveDays,
            netSalary: (baseSalary + bonus - unauthorizedDeduction).toFixed(2),
          });
        } else {
          const newSalary = await UserSalary.create({
            accountManagerID: req.user.id,
            employeeID: users[i].id,
          });
          salaryChunks.push({
            ...newSalary.toJSON(),
            workingDays: attendanceDays,
            approvedLeaveDays,
            unauthorizedLeaveDays,
            netSalary: "0.00",
          });
        }
      }

      res.render("Manager/viewemp_accountant", {
        title: "List Of Employees",
        csrfToken: req.csrfToken(),
        users: users,
        salary: salaryChunks,
        userName: req.user.name,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving employees");
  }
});

/**
 * Displays All the skills of the employee to the project manager.
 */

router.get(
  "/all-employee-skills/:id",
  async (req, res, next) => {
    const employeeId = req.params.id;
    try {
      const user = await User.findByPk(employeeId);
      res.render("Manager/employeeSkills", {
        title: "List Of Employee Skills",
        employee: user,
        moment: moment,
        csrfToken: req.csrfToken(),
        userName: req.user.name,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error retrieving employee skills");
    }
  }
);

/**
 * Displays all the projects of the employee to the project manager
 */

router.get(
  "/all-employee-projects/:id",
  async (req, res, next) => {
    const employeeId = req.params.id;
    try {
      const projects = await Project.findAll({
        where: { employeeID: employeeId },
        order: [['id', 'DESC']],
      });
      const hasProject = projects.length > 0 ? 1 : 0;
      const user = await User.findByPk(employeeId);

      res.render("Manager/employeeAllProjects", {
        title: "List Of Employee Projects",
        hasProject: hasProject,
        projects: projects,
        csrfToken: req.csrfToken(),
        user: user,
        userName: req.user.name,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error retrieving employee projects");
    }
  }
);

/**
 * Description:
 * Displays employee project information to the project manager
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get(
  "/employee-project-info/:id",
  async (req, res, next) => {
    const projectId = req.params.id;
    try {
      const project = await Project.findByPk(projectId);
      const user = await User.findByPk(project.employeeID);

      res.render("Manager/projectInfo", {
        title: "Employee Project Information",
        project: project,
        employee: user,
        moment: moment,
        csrfToken: req.csrfToken(),
        message: "",
        userName: req.user.name,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error retrieving project information");
    }
  }
);

/**
 * Description:
 * Displays the performance appraisal form for the employee to the project manager.
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get(
  "/provide-performance-appraisal/:id",
  async (req, res, next) => {
    const employeeId = req.params.id;
    try {
      const pa = await PerformanceAppraisal.findAll({
        where: { employeeID: employeeId },
      });

      if (pa.length > 0) {
        const users = await User.findAll({
          where: { type: "employee" },
        });
        res.render("Manager/viewemp_project", {
          title: "List Of Employees",
          csrfToken: req.csrfToken(),
          users: users,
          errors: 1,
          userName: req.user.name,
        });
      } else {
        const user = await User.findByPk(employeeId);
        res.render("Manager/performance_appraisal", {
          title: "Provide Performance Appraisal",
          csrfToken: req.csrfToken(),
          employee: user,
          moment: moment,
          message: "",
          userName: req.user.name,
        });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send("Error retrieving performance appraisal");
    }
  }
);

/**
 * Description:
 * Displays currently marked attendance to the manager.
 *
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
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

      res.render("Manager/viewAttendance", {
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
 * Description:
 * Displays leave application form for the manager to apply for leave
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get("/apply-for-leave", (req, res, next) => {
  res.render("Manager/managerApplyForLeave", {
    title: "Apply for Leave",
    csrfToken: req.csrfToken(),
    userName: req.user.name,
  });
});

/**
 * Description:
 * Manager gets the list of all his/her applied leaves.
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get("/applied-leaves", async (req, res, next) => {
  try {
    const leaves = await Leave.findAll({
      where: { applicantID: req.user.id },
      order: [['id', 'DESC']],
    });
    const hasLeave = leaves.length > 0 ? 1 : 0;

    res.render("Manager/managerAppliedLeaves", {
      title: "List Of Applied Leaves",
      csrfToken: req.csrfToken(),
      hasLeave: hasLeave,
      leaves: leaves,
      userName: req.user.name,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving applied leaves");
  }
});

/**
 * Description:
 * Displays logged in manager his/her profile.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get("/view-profile", async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.render("Manager/viewManagerProfile", {
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
 * Description:
 * Gets the id of the project to be shown form request parameters.
 * Displays the project to the project manager.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get("/view-project/:project_id", async (req, res, next) => {
  const projectId = req.params.project_id;
  try {
    const project = await Project.findByPk(projectId);
    res.render("Manager/viewManagerProject", {
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
 * Description:
 * Displays list of all the project managers project.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016 Salman Nizam
 *
 * Known Bugs: None
 */

router.get(
  "/view-all-personal-projects",
  async function viewAllPersonalProjects(req, res, next) {
    try {
      const projects = await Project.findAll({
        where: { employeeID: req.user.id },
        order: [["id", "DESC"]],
      });
      const hasProject = projects.length > 0 ? 1 : 0;

      res.render("Manager/viewManagerPersonalProjects", {
        title: "List Of Projects",
        hasProject: hasProject,
        projects: projects,
        csrfToken: req.csrfToken(),
        userName: req.user.name,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error retrieving personal projects");
    }
  }
);

/**
 * Description:
 * Checks if pay slip has already been generated.
 * If yes then fills the field of the form with current attributes.
 * Then displays the pay slip form for the employee to the project manager.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.get(
  "/generate-pay-slip/:employee_id",
  async function generatePaySlip(req, res, next) {
    const employeeId = req.params.employee_id;
    try {
      const user = await User.findByPk(employeeId);
      if (!user) {
        return res.status(404).send("Employee not found");
      }

      let paySlip = await PaySlip.findOne({ where: { employeeID: employeeId } });
      let hasPaySlip = 1;

      if (!paySlip) {
        hasPaySlip = 0;
        paySlip = await PaySlip.create({
          accountManagerID: req.user.id,
          employeeID: employeeId,
          bankName: "N/A",
          branchAddress: "N/A",
          basicPay: 0,
          overtime: 0,
          conveyanceAllowance: 0,
        });
      }

      res.render("Manager/generatePaySlip", {
        title: "Generate Pay Slip",
        csrfToken: req.csrfToken(),
        employee: user,
        pay_slip: paySlip,
        moment: moment,
        hasPaySlip: hasPaySlip,
        userName: req.user.name,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error generating pay slip page");
    }
  }
);

/**
 * Description:
 * Reads the parameters from the body of the post request.
 * Then saves the applied leave to the leave schema.
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post("/apply-for-leave", function applyForLeave(req, res, next) {
  Leave.create({
    applicantID: req.user.id,
    title: req.body.title,
    type: req.body.type,
    startDate: new Date(req.body.start_date),
    endDate: new Date(req.body.end_date),
    period: req.body.period,
    reason: req.body.reason,
    appliedDate: new Date(),
    adminResponse: "Pending",
  })
    .then(() => res.redirect("/manager/applied-leaves"))
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error applying for leave");
    });
});

/**
 * Description:
 * Sets the bonus of the selected employee in UserSalary Schema
 *
 
 *
 * Last Updated: 30th Novemebr, 2016
 *
 * Known Bugs: None
 */

router.post("/set-bonus", function setBonus(req, res) {
  UserSalary.findOne({ where: { employeeID: req.body.employee_bonus } })
    .then((us) => {
      if (!us) {
        return res.redirect("/manager/view-employees");
      }

      return us.update({
        bonus: Number(req.body.bonus || 0),
        reasonForBonus: req.body.reason || "N/A",
      });
    })
    .then(() => res.redirect("/manager/view-employees"))
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error updating bonus");
    });
});

/**
 * Description:
 * Sets the salary of the selected employee in UserSalary Schema
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post("/set-salary", function setSalary(req, res) {
  var employee_id = req.body.employee_salary;
  UserSalary.findOne({ where: { employeeID: employee_id } })
    .then((us) => {
      if (!us) {
        return res.redirect("/manager/view-employees");
      }

      return us.update({ salary: Number(req.body.salary || 0) });
    })
    .then(() => res.redirect("/manager/view-employees"))
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error updating salary");
    });
});

/**
 * Description:
 * Sets the Incremented salary of the selected employee in UserSalary Schema
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post("/increment-salary", function incrementSalary(req, res) {
  UserSalary.findOne({ where: { employeeID: req.body.employee_increment } })
    .then((us) => {
      if (!us) {
        return res.redirect("/manager/view-employees");
      }

      const newSalary =
        Number(req.body.current_salary || 0) +
        Number(req.body.amount_increment || 0);

      return us.update({ salary: newSalary });
    })
    .then(() => res.redirect("/manager/view-employees"))
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error incrementing salary");
    });
});

/**
 * Description:
 * Saves the performance appraisal of the employee against the employeeID in the PaySlip Schema.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post(
  "/provide-performance-appraisal",
  async function providePerformanceAppraisal(req, res) {
    const employeeId = req.body.employee_id;
    try {
      await PerformanceAppraisal.create({
        employeeID: employeeId,
        projectManagerID: req.user.id,
        rating: req.body.performance_rating,
        positionExpertise: req.body.expertise,
        approachTowardsQualityOfWork: req.body.approach_quality,
        approachTowardsQuantityOfWork: req.body.approach_quantity,
        leadershipManagementSkills: req.body.lead_manage,
        communicationSkills: req.body.skills_com,
        commentsOnOverallPerformance: req.body.comments,
      });
      res.redirect("/manager/view-employees");
    } catch (err) {
      console.log(err);
      res.status(500).send("Error saving performance appraisal");
    }
  }
);

/**
 * Description:
 * Stores the Pay Slip of employee in PaySlip schema if  not already stored
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post("/generate-pay-slip", async function generatePaySlip(req, res) {
  const employeeId = req.body.employee_id;
  try {
    const paySlip = await PaySlip.findOne({ where: { employeeID: employeeId } });
    if (!paySlip) {
      return res.status(404).send("Pay slip not found");
    }

    await paySlip.update({
      bankName: req.body.bname,
      branchAddress: req.body.baddress,
      basicPay: req.body.pay,
      overtime: req.body.otime,
      conveyanceAllowance: req.body.allowance,
    });

    res.redirect("/manager/view-employees");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error generating pay slip");
  }
});

/**
 * Description:
 * Displays attendance to the manager for the given year and month.
 *
 * Author: Hassan Qureshi
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post("/view-attendance", async function viewAttendance(req, res, next) {
  try {
    const attendances = await Attendance.findAll({
      where: {
        employeeID: req.user.id,
        month: req.body.month,
        year: req.body.year,
      },
      order: [["id", "DESC"]],
    });

    const found = attendances.length > 0 ? 1 : 0;
    res.render("Manager/viewAttendance", {
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
    res.status(500).send("Error retrieving manager attendance");
  }
});

/**
 * Description:
 * Marks the attendance of the manager in current date
 *
 
 *
 * Last Updated: 30th November, 2016
 *
 * Known Bugs: None
 */

router.post(
  "/mark-manager-attendance",
  async function markAttendance(req, res, next) {
    try {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const date = new Date().getDate();

      const docs = await Attendance.findAll({
        where: {
          employeeID: req.user.id,
          date,
          month,
          year,
        },
      });

      if (docs.length === 0) {
        await Attendance.create({
          employeeID: req.user.id,
          year,
          month,
          date,
          present: 1,
        });
      }

      res.redirect("/manager/view-attendance-current");
    } catch (err) {
      console.log(err);
      res.status(500).send("Error marking manager attendance");
    }
  }
);
module.exports = router;
