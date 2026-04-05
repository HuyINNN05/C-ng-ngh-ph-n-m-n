/**
 * This script initializes MySQL tables for HRMS.
 *
 * It first connects to the MySQL database using Sequelize.
 * Then, it synchronizes all Sequelize models to create required tables.
 * No default users are inserted.
 *
 */

const db = require("../db");

async function initializeDatabase() {
  try {
    await db.connect();
    console.log("✓ Database connected");

    await db.syncModels();
    console.log("✓ Models synchronized");
    console.log("✓ Schema initialized successfully (no default users created)");

    await db.close();
    process.exit(0);
  } catch (err) {
    console.error("✗ Error initializing database:", err);
    process.exit(1);
  }
}

initializeDatabase();