const { DataTypes } = require("sequelize");
const db = require("../db");
const User = require("./user");

const PaySlip = db.sequelize.define("PaySlip", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  accountManagerID: {
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
  bankName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  branchAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  basicPay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  overtime: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  conveyanceAllowance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
});

PaySlip.belongsTo(User, { foreignKey: "accountManagerID", as: "accountManager" });
PaySlip.belongsTo(User, { foreignKey: "employeeID", as: "employee" });

module.exports = PaySlip;
