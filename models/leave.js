const { DataTypes } = require("sequelize");
const db = require("../db");
const User = require("./user");

const Leave = db.sequelize.define("Leave", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  applicantID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: "id",
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  appliedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  period: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 10 },
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  adminResponse: {
    type: DataTypes.STRING,
    defaultValue: "N/A",
  },
});

Leave.belongsTo(User, { foreignKey: "applicantID", as: "applicant" });

module.exports = Leave;
