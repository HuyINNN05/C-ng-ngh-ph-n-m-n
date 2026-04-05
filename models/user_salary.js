const { DataTypes } = require("sequelize");
const db = require("../db");
const User = require("./user");

const UserSalary = db.sequelize.define("UserSalary", {
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
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  bonus: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  reasonForBonus: {
    type: DataTypes.STRING,
    defaultValue: "N/A",
  },
});

UserSalary.belongsTo(User, { foreignKey: "accountManagerID", as: "accountManager" });
UserSalary.belongsTo(User, { foreignKey: "employeeID", as: "employee" });

module.exports = UserSalary;
