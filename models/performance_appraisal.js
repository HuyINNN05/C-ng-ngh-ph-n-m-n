const { DataTypes } = require("sequelize");
const db = require("../db");
const User = require("./user");

const PerformanceAppraisal = db.sequelize.define("PerformanceAppraisal", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  projectManagerID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: "id",
    },
  },
  employeeID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: "id",
    },
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0, max: 5 },
  },
  positionExpertise: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  approachTowardsQualityOfWork: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approachTowardsQuantityOfWork: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  leadershipManagementSkills: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  communicationSkills: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  commentsOnOverallPerformance: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

PerformanceAppraisal.belongsTo(User, { foreignKey: "projectManagerID", as: "projectManager" });
PerformanceAppraisal.belongsTo(User, { foreignKey: "employeeID", as: "employee" });

module.exports = PerformanceAppraisal;
