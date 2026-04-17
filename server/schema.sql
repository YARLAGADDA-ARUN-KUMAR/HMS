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

-- ── Employee (supertype for Doctor) ────────────────────────
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





-- ── Rooms ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Rooms (
  `R-ID`       INT          AUTO_INCREMENT PRIMARY KEY,
  Type         VARCHAR(50),
  Capacity     TINYINT UNSIGNED,
  Availability TINYINT(1)   DEFAULT 1
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





-- ── Sample Data ───────────────────────────────────
INSERT INTO Patient (Name, DOB, Age, Gender, `Mob-No`) VALUES
  ('Arjun Reddy',    '1990-05-12', 34, 'Male',   '9876543210'),
  ('Priya Sharma',   '1985-11-23', 39, 'Female',  '9123456780'),
  ('Ravi Kumar',     '2000-03-08', 24, 'Male',   '9988776655'),
  ('Lakshmi Devi',   '1972-07-30', 52, 'Female',  '8877665544');

INSERT INTO Employee (Name, Salary, `Mob-No`, Address, City, State, `Pin-no`) VALUES
  ('Dr. S. Prasad',  95000, '9000011111', '12 Gandhi Rd',    'Kurnool',    'Andhra Pradesh', '518001'),
  ('Dr. A. Verma',   88000, '9000022222', '5 Nehru Street',  'Hyderabad',  'Telangana',      '500001');

INSERT INTO Doctor (`E-ID`, Dept, Qualification, Sex) VALUES
  (1, 'Cardiology',  'MD, DM Cardiology',  'Male'),
  (2, 'Orthopedics', 'MS Ortho',           'Male');

INSERT INTO Rooms (Type, Capacity, Availability) VALUES
  ('General', 6, 1),
  ('ICU',     2, 1),
  ('Private', 1, 0),
  ('Semi-Private', 2, 1);

-- ── Appointments Sample Data ────────────────────
INSERT INTO Appointment (`P-ID`, `D-E-ID`, `R-ID`, `Scheduled-At`, Status, Notes) VALUES
  (1, 1, 1, '2026-04-20 09:00:00', 'Scheduled', 'Routine cardiac checkup'),
  (2, 2, 2, '2026-04-21 10:30:00', 'Completed', 'Post-surgery follow-up'),
  (3, 1, NULL, '2026-04-22 14:00:00', 'Scheduled', 'Initial consultation'),
  (4, 2, 1, '2026-04-23 11:00:00', 'Scheduled', 'Orthopedic examination');

-- ── Medications Sample Data ──────────────────────
INSERT INTO Medication (`Name`, `Dosage-Form`, `Manufacturer`) VALUES
  ('Aspirin', 'Tablet', 'Bayer'),
  ('Lisinopril', 'Tablet', 'AstraZeneca'),
  ('Metformin', 'Tablet', 'Merck'),
  ('Amoxicillin', 'Capsule', 'Pfizer'),
  ('Ibuprofen', 'Tablet', 'Johnson & Johnson'),
  ('Omeprazole', 'Capsule', 'Abbott'),
  ('Atorvastatin', 'Tablet', 'Cipla'),
  ('Cetirizine', 'Tablet', 'Sun Pharma');

-- ── Prescriptions Sample Data ────────────────────
INSERT INTO Prescription (`P-ID`, `D-E-ID`, `Created-At`, `Notes`) VALUES
  (1, 1, '2026-04-18 09:30:00', 'Post-consultation prescription for heart health'),
  (2, 2, '2026-04-17 14:00:00', 'Pain management post-surgery'),
  (3, 1, '2026-04-19 10:00:00', 'Initial treatment plan'),
  (4, 2, '2026-04-16 15:30:00', 'Inflammation and pain relief');

-- ── Prescription Items Sample Data ──────────────
INSERT INTO PrescriptionItem (`PR-ID`, `MED-ID`, `Dosage`, `Instructions`) VALUES
  (1, 1, '100 mg', 'Once daily after breakfast'),
  (1, 2, '10 mg', 'Once daily in the evening'),
  (2, 5, '400 mg', 'Every 6 hours with food'),
  (2, 6, '20 mg', 'Once daily before meals'),
  (3, 3, '500 mg', 'Twice daily with meals'),
  (3, 8, '10 mg', 'Once daily at bedtime'),
  (4, 5, '600 mg', 'Every 8 hours with food'),
  (4, 7, '20 mg', 'Once daily in the evening');





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
