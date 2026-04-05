const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt-nodejs");
const db = require("../db");

function normalizeSkills(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch (err) {
      // Fallback for legacy plain strings such as "Java" or "Java,PHP".
    }

    return trimmed.includes(",")
      ? trimmed.split(",").map((item) => item.trim()).filter(Boolean)
      : [trimmed];
  }

  return [];
}

const User = db.sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM("admin", "employee", "project_manager", "accounts_manager"),
      defaultValue: "employee",
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    contactNumber: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        is: {
          args: /^0[0-9]{9}$/,
          msg: 'Phone number must be 10 digits starting with 0 (Vietnam format)'
        }
      }
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    Skills: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      defaultValue: "[]",
      get() {
        return normalizeSkills(this.getDataValue("Skills"));
      },
      set(value) {
        this.setDataValue("Skills", JSON.stringify(normalizeSkills(value)));
      },
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateAdded: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    createdAt: "dateAdded",
    updatedAt: "updatedAt",
  }
);

// Instance methods
User.prototype.encryptPassword = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(5), null);
};

User.prototype.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

module.exports = User;
