-- HRMS MySQL full schema import file (high compatibility)
-- Purpose: create all tables needed by this project and insert a default admin.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS HRMS;
CREATE DATABASE HRMS CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE HRMS;

DROP TABLE IF EXISTS Sessions;
DROP TABLE IF EXISTS PerformanceAppraisals;
DROP TABLE IF EXISTS UserSalaries;
DROP TABLE IF EXISTS PaySlips;
DROP TABLE IF EXISTS Projects;
DROP TABLE IF EXISTS Leaves;
DROP TABLE IF EXISTS Attendances;
DROP TABLE IF EXISTS Users;

CREATE TABLE Users (
  id INT NOT NULL AUTO_INCREMENT,
  type ENUM('admin', 'employee', 'project_manager', 'accounts_manager') DEFAULT 'employee',
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  dateOfBirth DATETIME NOT NULL,
  contactNumber VARCHAR(10) NOT NULL,
  department VARCHAR(255) DEFAULT NULL,
  Skills LONGTEXT DEFAULT NULL,
  designation VARCHAR(255) DEFAULT NULL,
  dateAdded TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Attendances (
  id INT NOT NULL AUTO_INCREMENT,
  employeeID INT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  `date` INT NOT NULL,
  present TINYINT(1) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY attendances_employee_idx (employeeID),
  CONSTRAINT attendances_employee_fk FOREIGN KEY (employeeID) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Leaves (
  id INT NOT NULL AUTO_INCREMENT,
  applicantID INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  startDate DATETIME NOT NULL,
  endDate DATETIME NOT NULL,
  appliedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  period INT NOT NULL,
  reason TEXT NOT NULL,
  adminResponse VARCHAR(255) DEFAULT 'N/A',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY leaves_applicant_idx (applicantID),
  CONSTRAINT leaves_applicant_fk FOREIGN KEY (applicantID) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Projects (
  id INT NOT NULL AUTO_INCREMENT,
  employeeID INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  status VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  startDate DATETIME NOT NULL,
  endDate DATETIME NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY projects_employee_idx (employeeID),
  CONSTRAINT projects_employee_fk FOREIGN KEY (employeeID) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE PaySlips (
  id INT NOT NULL AUTO_INCREMENT,
  accountManagerID INT NOT NULL,
  employeeID INT NOT NULL,
  bankName VARCHAR(255) NOT NULL,
  branchAddress VARCHAR(255) NOT NULL,
  basicPay DECIMAL(10,2) NOT NULL,
  overtime DECIMAL(10,2) DEFAULT 0.00,
  conveyanceAllowance DECIMAL(10,2) DEFAULT 0.00,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY payslips_manager_idx (accountManagerID),
  KEY payslips_employee_idx (employeeID),
  CONSTRAINT payslips_manager_fk FOREIGN KEY (accountManagerID) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT payslips_employee_fk FOREIGN KEY (employeeID) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE UserSalaries (
  id INT NOT NULL AUTO_INCREMENT,
  accountManagerID INT NOT NULL,
  employeeID INT NOT NULL,
  salary DECIMAL(10,2) DEFAULT 0.00,
  bonus DECIMAL(10,2) DEFAULT 0.00,
  reasonForBonus VARCHAR(255) DEFAULT 'N/A',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY usersalaries_manager_idx (accountManagerID),
  KEY usersalaries_employee_idx (employeeID),
  CONSTRAINT usersalaries_manager_fk FOREIGN KEY (accountManagerID) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT usersalaries_employee_fk FOREIGN KEY (employeeID) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE PerformanceAppraisals (
  id INT NOT NULL AUTO_INCREMENT,
  projectManagerID INT NOT NULL,
  employeeID INT NOT NULL,
  rating INT NOT NULL,
  positionExpertise LONGTEXT DEFAULT NULL,
  approachTowardsQualityOfWork TEXT,
  approachTowardsQuantityOfWork TEXT,
  leadershipManagementSkills TEXT NOT NULL,
  communicationSkills TEXT NOT NULL,
  commentsOnOverallPerformance TEXT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY appraisals_manager_idx (projectManagerID),
  KEY appraisals_employee_idx (employeeID),
  CONSTRAINT appraisals_manager_fk FOREIGN KEY (projectManagerID) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT appraisals_employee_fk FOREIGN KEY (employeeID) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Sessions (
  sid VARCHAR(36) NOT NULL,
  expires DATETIME DEFAULT NULL,
  data MEDIUMTEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sid),
  KEY sessions_expires_idx (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Default admin account (password: admin123)
INSERT INTO Users(type, email, password, name, dateOfBirth, contactNumber, department, Skills, designation)
VALUES (
  'admin',
  'admin@admin.com',
  '$2a$05$3zLrRqJpNN5Bv1kpcBuYrueWsT9Jgcq5rOVstKBuOdsrZRv7teb9O',
  'System Administrator',
  '1990-01-01 00:00:00',
  '0987654321',
  'Administration',
  '[]',
  'Admin'
);

-- Default accounts manager account (password: 123456)
INSERT INTO Users(type, email, password, name, dateOfBirth, contactNumber, department, Skills, designation)
VALUES (
  'accounts_manager',
  'account.manager@hrms.com',
  '$2a$05$2D9EMMt/hTN5V0pwJ5xnYeKlw1zU/G/WFYg7LoLcKmIZ05D3.Q0iW',
  'Account Manager',
  '1995-01-01 00:00:00',
  '0981234567',
  'Accounts',
  '["Payroll"]',
  'Accounts Manager'
);

-- Default employee account (password: 123456)
INSERT INTO Users(type, email, password, name, dateOfBirth, contactNumber, department, Skills, designation)
VALUES (
  'employee',
  'employee@hrms.com',
  '$2a$05$2D9EMMt/hTN5V0pwJ5xnYeKlw1zU/G/WFYg7LoLcKmIZ05D3.Q0iW',
  'Employee Demo',
  '2000-01-01 00:00:00',
  '0912345678',
  'Software Development',
  '["Java"]',
  'Employee'
);

-- Default salary setup for demo employee
INSERT INTO UserSalaries(accountManagerID, employeeID, salary, bonus, reasonForBonus)
VALUES (
  (SELECT id FROM Users WHERE email = 'account.manager@hrms.com' LIMIT 1),
  (SELECT id FROM Users WHERE email = 'employee@hrms.com' LIMIT 1),
  12000000.00,
  500000.00,
  'Monthly performance bonus'
);


