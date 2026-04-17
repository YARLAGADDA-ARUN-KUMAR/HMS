-- ============================================================
--  Hospital Management System — MySQL Schema
--  Run this file once: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS hospital_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hospital_db;

-- ── Patient ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS Patient (
  `P-ID`    INT          AUTO_INCREMENT PRIMARY KEY,
  Name      VARCHAR(100) NOT NULL,
  DOB       DATE,
  Age       TINYINT UNSIGNED,
  Gender    ENUM('Male','Female','Other'),
  `Mob-No`  CHAR(10)
) ENGINE=InnoDB;

-- ── Employee (supertype for Doctor, Nurse, Receptionist) ──
CREATE TABLE IF NOT EXISTS Employee (
  `E-ID`    INT          AUTO_INCREMENT PRIMARY KEY,
  Name      VARCHAR(100) NOT NULL,
  Salary    DECIMAL(10,2),
  `Mob-No`  CHAR(10),
  Address   VARCHAR(200),
  City      VARCHAR(80),
  State     VARCHAR(80),
  `Pin-no`  CHAR(6)
) ENGINE=InnoDB;

-- ── Doctor (ISA Employee) ─────────────────────────
CREATE TABLE IF NOT EXISTS Doctor (
  `E-ID`        INT PRIMARY KEY,
  Dept          VARCHAR(100),
  Qualification VARCHAR(100),
  Sex           ENUM('Male','Female','Other'),
  FOREIGN KEY (`E-ID`) REFERENCES Employee(`E-ID`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Nurse (ISA Employee) ──────────────────────────
CREATE TABLE IF NOT EXISTS Nurse (
  `E-ID`  INT PRIMARY KEY,
  Sex     ENUM('Male','Female','Other'),
  FOREIGN KEY (`E-ID`) REFERENCES Employee(`E-ID`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Receptionist (ISA Employee) ───────────────────
CREATE TABLE IF NOT EXISTS Receptionist (
  `E-ID`  INT PRIMARY KEY,
  FOREIGN KEY (`E-ID`) REFERENCES Employee(`E-ID`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Rooms ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Rooms (
  `R-ID`       INT          AUTO_INCREMENT PRIMARY KEY,
  Type         VARCHAR(50),
  Capacity     TINYINT UNSIGNED,
  Availability TINYINT(1)   DEFAULT 1
) ENGINE=InnoDB;

-- ── Bills ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Bills (
  `B-ID`   INT          AUTO_INCREMENT PRIMARY KEY,
  `P-ID`   INT,
  Amount   DECIMAL(10,2),
  FOREIGN KEY (`P-ID`) REFERENCES Patient(`P-ID`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Test_Report ───────────────────────────────────
CREATE TABLE IF NOT EXISTS Test_Report (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  `P-ID`      INT,
  `R-ID`      INT,
  `Test-Type` VARCHAR(100),
  Result      VARCHAR(200),
  FOREIGN KEY (`P-ID`) REFERENCES Patient(`P-ID`) ON DELETE SET NULL,
  FOREIGN KEY (`R-ID`) REFERENCES Rooms(`R-ID`)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Records (maintained by Receptionist) ─────────
CREATE TABLE IF NOT EXISTS Records (
  `Record-no`  INT AUTO_INCREMENT PRIMARY KEY,
  `App-no`     VARCHAR(50)
) ENGINE=InnoDB;

-- ── Consults (Patient M:N Doctor) ─────────────────
CREATE TABLE IF NOT EXISTS Consults (
  `P-ID`  INT,
  `E-ID`  INT,
  PRIMARY KEY (`P-ID`, `E-ID`),
  FOREIGN KEY (`P-ID`) REFERENCES Patient(`P-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`E-ID`) REFERENCES Doctor(`E-ID`)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Assigned (Patient assigned to Room) ──────────
CREATE TABLE IF NOT EXISTS Assigned (
  `P-ID`  INT,
  `R-ID`  INT,
  PRIMARY KEY (`P-ID`, `R-ID`),
  FOREIGN KEY (`P-ID`) REFERENCES Patient(`P-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`R-ID`) REFERENCES Rooms(`R-ID`)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Governs (Nurse M:M Rooms) ─────────────────────
CREATE TABLE IF NOT EXISTS Governs (
  `E-ID`  INT,
  `R-ID`  INT,
  PRIMARY KEY (`E-ID`, `R-ID`),
  FOREIGN KEY (`E-ID`) REFERENCES Nurse(`E-ID`)  ON DELETE CASCADE,
  FOREIGN KEY (`R-ID`) REFERENCES Rooms(`R-ID`)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Maintains (Receptionist M:M Records) ─────────
CREATE TABLE IF NOT EXISTS Maintains (
  `E-ID`      INT,
  `Record-no` INT,
  PRIMARY KEY (`E-ID`, `Record-no`),
  FOREIGN KEY (`E-ID`)      REFERENCES Receptionist(`E-ID`)  ON DELETE CASCADE,
  FOREIGN KEY (`Record-no`) REFERENCES Records(`Record-no`)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Sample Data ───────────────────────────────────
INSERT INTO Patient (Name, DOB, Age, Gender, `Mob-No`) VALUES
  ('Arjun Reddy',    '1990-05-12', 34, 'Male',   '9876543210'),
  ('Priya Sharma',   '1985-11-23', 39, 'Female',  '9123456780'),
  ('Ravi Kumar',     '2000-03-08', 24, 'Male',   '9988776655'),
  ('Lakshmi Devi',   '1972-07-30', 52, 'Female',  '8877665544');

INSERT INTO Employee (Name, Salary, `Mob-No`, Address, City, State, `Pin-no`) VALUES
  ('Dr. S. Prasad',  95000, '9000011111', '12 Gandhi Rd',    'Kurnool',    'Andhra Pradesh', '518001'),
  ('Dr. A. Verma',   88000, '9000022222', '5 Nehru Street',  'Hyderabad',  'Telangana',      '500001'),
  ('Nurse Kavya',    35000, '9000033333', '7 MG Road',       'Kurnool',    'Andhra Pradesh', '518002'),
  ('Nurse Deepa',    33000, '9000044444', '3 Lake View',     'Vijayawada', 'Andhra Pradesh', '520001');

INSERT INTO Doctor (`E-ID`, Dept, Qualification, Sex) VALUES
  (1, 'Cardiology',  'MD, DM Cardiology',  'Male'),
  (2, 'Orthopedics', 'MS Ortho',           'Male');

INSERT INTO Nurse (`E-ID`, Sex) VALUES
  (3, 'Female'),
  (4, 'Female');

INSERT INTO Rooms (Type, Capacity, Availability) VALUES
  ('General', 6, 1),
  ('ICU',     2, 1),
  ('Private', 1, 0),
  ('Semi-Private', 2, 1);

INSERT INTO Bills (`P-ID`, Amount) VALUES
  (1, 12500.00),
  (2, 8750.50),
  (3, 3200.00);

INSERT INTO Test_Report (`P-ID`, `R-ID`, `Test-Type`, Result) VALUES
  (1, 2, 'Blood Test',  'Normal'),
  (2, 1, 'X-Ray',       'Fracture detected'),
  (3, 1, 'ECG',         'Normal');

INSERT INTO Records (`App-no`) VALUES ('APP-2024-001'), ('APP-2024-002');

-- ── Auth (Login) ─────────────────────────────────────
-- Tables for JWT login
CREATE TABLE IF NOT EXISTS Role (
  `Role-ID` INT AUTO_INCREMENT PRIMARY KEY,
  `Name`     VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS AuthUser (
  `U-ID`          INT AUTO_INCREMENT PRIMARY KEY,
  `E-ID`          INT NULL,
  `Username`     VARCHAR(80)  NOT NULL UNIQUE,
  `Password-Hash` VARCHAR(255) NOT NULL,
  `Role-ID`       INT NOT NULL,
  `Is-Active`     TINYINT(1) DEFAULT 1,
  `Created-At`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`E-ID`) REFERENCES Employee(`E-ID`) ON DELETE SET NULL,
  FOREIGN KEY (`Role-ID`) REFERENCES Role(`Role-ID`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Seed roles (safe to re-run)
INSERT INTO Role (`Name`) VALUES
  ('admin'),
  ('doctor'),
  ('nurse'),
  ('receptionist')
ON DUPLICATE KEY UPDATE `Name` = VALUES(`Name`);

-- ── Appointments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS Appointment (
  `A-ID`           INT AUTO_INCREMENT PRIMARY KEY,
  `P-ID`           INT NOT NULL,
  `D-E-ID`         INT NOT NULL,
  `R-ID`           INT NULL,
  `Scheduled-At`  DATETIME,
  `Status`         ENUM('Scheduled','Completed','Cancelled') DEFAULT 'Scheduled',
  `Notes`          VARCHAR(200),
  FOREIGN KEY (`P-ID`)   REFERENCES Patient(`P-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`D-E-ID`) REFERENCES Doctor(`E-ID`)  ON DELETE CASCADE,
  FOREIGN KEY (`R-ID`)   REFERENCES Rooms(`R-ID`)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Prescriptions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS Prescription (
  `PR-ID`       INT AUTO_INCREMENT PRIMARY KEY,
  `P-ID`        INT NOT NULL,
  `D-E-ID`      INT NOT NULL,
  `Created-At` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `Notes`       VARCHAR(500),
  FOREIGN KEY (`P-ID`)   REFERENCES Patient(`P-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`D-E-ID`) REFERENCES Doctor(`E-ID`)  ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Medication (
  `MED-ID`      INT AUTO_INCREMENT PRIMARY KEY,
  `Name`        VARCHAR(120) NOT NULL UNIQUE,
  `Dosage-Form` VARCHAR(80),
  `Manufacturer` VARCHAR(120)
) ENGINE=InnoDB;

-- M:N between Prescription and Medication
CREATE TABLE IF NOT EXISTS PrescriptionItem (
  `PR-ID`       INT NOT NULL,
  `MED-ID`      INT NOT NULL,
  `Dosage`      VARCHAR(100) NOT NULL,
  `Instructions` VARCHAR(200),
  PRIMARY KEY (`PR-ID`, `MED-ID`),
  FOREIGN KEY (`PR-ID`)  REFERENCES Prescription(`PR-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`MED-ID`) REFERENCES Medication(`MED-ID`)   ON DELETE RESTRICT
) ENGINE=InnoDB;
