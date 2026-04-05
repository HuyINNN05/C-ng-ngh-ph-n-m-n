const { Sequelize } = require("sequelize");
require("dotenv").config();

let dbName, dbUser, dbPassword;

switch (process.env.NODE_ENV) {
  case "test":
    dbName = process.env.DB_NAME_TEST;
    break;
  default:
    dbName = process.env.DB_NAME;
}

dbUser = process.env.DB_USER;
dbPassword = process.env.DB_PASSWORD;

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: "mysql",
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const connect = async () => {
  try {
    await sequelize.authenticate();
    console.log("✓ MySQL connection has been established successfully");
    return sequelize;
  } catch (error) {
    console.error("✗ Unable to connect to MySQL database:", error);
    throw error;
  }
};

const syncModels = async () => {
  try {
    await sequelize.sync({ alter: false });
    console.log("✓ All models synchronized with database");
  } catch (error) {
    console.error("✗ Error synchronizing models:", error);
    throw error;
  }
};

const close = () => {
  return sequelize.close();
};

const getSequelize = () => {
  return sequelize;
};

module.exports = { sequelize, connect, syncModels, close, getSequelize };
