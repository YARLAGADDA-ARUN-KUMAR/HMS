-- ============================================================
--  MediCore — Hospital Management System (3NF Schema)
--  Run: mysql -u root -p < schema.sql
--  All tables normalized to Third Normal Form (3NF)
-- ============================================================

CREATE DATABASE IF NOT EXISTS hospital_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hospital_db;

-- ── Department ───────────────────────────────────────────────
-- 3NF: Eliminates string-based dept name stored in Employee/Doctor
CREATE TABLE IF NOT EXISTS Department (
  `Dept-ID`    INT          AUTO_INCREMENT PRIMARY KEY,
  `Name`       VARCHAR(100) NOT NULL UNIQUE,
  `Description` VARCHAR(300),
  `Head-Count`  TINYINT UNSIGNED DEFAULT 0
) ENGINE=InnoDB;

-- ── Supplier ─────────────────────────────────────────────────
-- 3NF: Eliminates raw Manufacturer string in Medication
CREATE TABLE IF NOT EXISTS Supplier (
  `Sup-ID`    INT          AUTO_INCREMENT PRIMARY KEY,
  `Name`      VARCHAR(150) NOT NULL UNIQUE,
  `ContactNo` CHAR(10),
  `Email`     VARCHAR(120),
  `Address`   VARCHAR(200),
  `City`      VARCHAR(80),
  `State`     VARCHAR(80)
) ENGINE=InnoDB;

-- ── Employee (supertype) ─────────────────────────────────────
-- Links to Department via FK (3NF: no transitive dept string)
CREATE TABLE IF NOT EXISTS Employee (
  `E-ID`    INT          AUTO_INCREMENT PRIMARY KEY,
  `Name`    VARCHAR(100) NOT NULL,
  `Salary`  DECIMAL(10,2),
  `Mob-No`  CHAR(10),
  `Address` VARCHAR(200),
  `City`    VARCHAR(80),
  `State`   VARCHAR(80),
  `Pin-no`  CHAR(6),
  `Dept-ID` INT,
  FOREIGN KEY (`Dept-ID`) REFERENCES Department(`Dept-ID`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Doctor (ISA Employee) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS Doctor (
  `E-ID`        INT PRIMARY KEY,
  `Qualification` VARCHAR(100),
  `Sex`           ENUM('Male','Female','Other'),
  FOREIGN KEY (`E-ID`) REFERENCES Employee(`E-ID`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Nurse (ISA Employee) ─────────────────────────────────────
-- New entity: Nurses are employees with a license and shift
CREATE TABLE IF NOT EXISTS Nurse (
  `E-ID`       INT PRIMARY KEY,
  `License-No` VARCHAR(50) UNIQUE,
  `Shift`      ENUM('Morning','Evening','Night') DEFAULT 'Morning',
  FOREIGN KEY (`E-ID`) REFERENCES Employee(`E-ID`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Patient ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Patient (
  `P-ID`   INT          AUTO_INCREMENT PRIMARY KEY,
  `Name`   VARCHAR(100) NOT NULL,
  `DOB`    DATE,
  `Age`    TINYINT UNSIGNED,
  `Gender` ENUM('Male','Female','Other'),
  `Mob-No` CHAR(10),
  `Blood-Group` VARCHAR(5)
) ENGINE=InnoDB;

-- ── Rooms ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Rooms (
  `R-ID`        INT          AUTO_INCREMENT PRIMARY KEY,
  `Type`        VARCHAR(50),
  `Capacity`    TINYINT UNSIGNED,
  `Availability` TINYINT(1)  DEFAULT 1,
  `Floor`       TINYINT UNSIGNED DEFAULT 1,
  `Daily-Rate`  DECIMAL(8,2) DEFAULT 0.00
) ENGINE=InnoDB;

-- ── Medication ───────────────────────────────────────────────
-- 3NF: Manufacturer replaced with FK to Supplier
CREATE TABLE IF NOT EXISTS Medication (
  `MED-ID`      INT          AUTO_INCREMENT PRIMARY KEY,
  `Name`        VARCHAR(120) NOT NULL UNIQUE,
  `Dosage-Form` VARCHAR(80),
  `Sup-ID`      INT,
  `Unit-Price`  DECIMAL(8,2) DEFAULT 0.00,
  `Stock-Qty`   INT          DEFAULT 0,
  FOREIGN KEY (`Sup-ID`) REFERENCES Supplier(`Sup-ID`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Appointment ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Appointment (
  `A-ID`         INT          AUTO_INCREMENT PRIMARY KEY,
  `P-ID`         INT          NOT NULL,
  `D-E-ID`       INT          NOT NULL,
  `R-ID`         INT          NULL,
  `Scheduled-At` DATETIME,
  `Status`       ENUM('Scheduled','Completed','Cancelled') DEFAULT 'Scheduled',
  `Notes`        VARCHAR(300),
  FOREIGN KEY (`P-ID`)   REFERENCES Patient(`P-ID`)  ON DELETE CASCADE,
  FOREIGN KEY (`D-E-ID`) REFERENCES Doctor(`E-ID`)   ON DELETE CASCADE,
  FOREIGN KEY (`R-ID`)   REFERENCES Rooms(`R-ID`)    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Bill ─────────────────────────────────────────────────────
-- New entity: Financial billing per appointment
CREATE TABLE IF NOT EXISTS Bill (
  `Bill-ID`   INT            AUTO_INCREMENT PRIMARY KEY,
  `P-ID`      INT            NOT NULL,
  `A-ID`      INT            NULL,
  `Amount`    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `Status`    ENUM('Pending','Paid','Cancelled') DEFAULT 'Pending',
  `Issued-At` DATETIME       DEFAULT CURRENT_TIMESTAMP,
  `Paid-At`   DATETIME       NULL,
  `Notes`     VARCHAR(300),
  FOREIGN KEY (`P-ID`) REFERENCES Patient(`P-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`A-ID`) REFERENCES Appointment(`A-ID`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Prescription ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Prescription (
  `PR-ID`      INT  AUTO_INCREMENT PRIMARY KEY,
  `P-ID`       INT  NOT NULL,
  `D-E-ID`     INT  NOT NULL,
  `Created-At` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `Notes`      VARCHAR(500),
  FOREIGN KEY (`P-ID`)   REFERENCES Patient(`P-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`D-E-ID`) REFERENCES Doctor(`E-ID`)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── PrescriptionItem (M:N Prescription × Medication) ─────────
CREATE TABLE IF NOT EXISTS PrescriptionItem (
  `PR-ID`        INT          NOT NULL,
  `MED-ID`       INT          NOT NULL,
  `Dosage`       VARCHAR(100) NOT NULL,
  `Instructions` VARCHAR(200),
  PRIMARY KEY (`PR-ID`, `MED-ID`),
  FOREIGN KEY (`PR-ID`)  REFERENCES Prescription(`PR-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`MED-ID`) REFERENCES Medication(`MED-ID`)  ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── Consults (Patient M:N Doctor) ────────────────────────────
CREATE TABLE IF NOT EXISTS Consults (
  `P-ID` INT,
  `E-ID` INT,
  PRIMARY KEY (`P-ID`, `E-ID`),
  FOREIGN KEY (`P-ID`) REFERENCES Patient(`P-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`E-ID`) REFERENCES Doctor(`E-ID`)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Assigned (Patient M:N Room) ───────────────────────────────
CREATE TABLE IF NOT EXISTS Assigned (
  `P-ID` INT,
  `R-ID` INT,
  PRIMARY KEY (`P-ID`, `R-ID`),
  FOREIGN KEY (`P-ID`) REFERENCES Patient(`P-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`R-ID`) REFERENCES Rooms(`R-ID`)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════
--  SAMPLE DATA
-- ════════════════════════════════════════════════════════════

INSERT INTO Department (`Name`, `Description`, `Head-Count`) VALUES
  ('Cardiology',   'Heart and cardiovascular care', 12),
  ('Orthopedics',  'Bone, joint and muscle treatment', 8),
  ('Neurology',    'Brain and nervous system disorders', 10),
  ('Pediatrics',   'Medical care for infants and children', 15),
  ('Radiology',    'Imaging and diagnostic services', 6);

INSERT INTO Supplier (`Name`, `ContactNo`, `Email`, `Address`, `City`, `State`) VALUES
  ('Bayer Pharma',        '9001112222', 'orders@bayer.in',    '14 Industrial Area', 'Mumbai',     'Maharashtra'),
  ('AstraZeneca India',   '9002223333', 'supply@az.in',       '7 Pharma Park',      'Pune',       'Maharashtra'),
  ('Sun Pharma',          '9003334444', 'sunpharma@sun.in',   '22 Science City Rd', 'Ahmedabad',  'Gujarat'),
  ('Cipla Limited',       '9004445555', 'cipla@cipla.in',     '3 Eastern Express',  'Mumbai',     'Maharashtra'),
  ('Abbott India',        '9005556666', 'abbott@abbott.in',   '9 Whitefield',       'Bangalore',  'Karnataka');

INSERT INTO Employee (`Name`, `Salary`, `Mob-No`, `Address`, `City`, `State`, `Pin-no`, `Dept-ID`) VALUES
  ('Dr. S. Prasad',   95000, '9000011111', '12 Gandhi Rd',   'Kurnool',   'Andhra Pradesh', '518001', 1),
  ('Dr. A. Verma',    88000, '9000022222', '5 Nehru Street', 'Hyderabad', 'Telangana',      '500001', 2),
  ('Dr. R. Mehta',    92000, '9000033333', '8 MG Road',      'Bangalore', 'Karnataka',      '560001', 3),
  ('Dr. P. Nair',     85000, '9000044444', '15 Lake View',   'Chennai',   'Tamil Nadu',     '600001', 4),
  ('Nurse Saranya',   42000, '9000055555', '3 Park Lane',    'Kurnool',   'Andhra Pradesh', '518002', 1),
  ('Nurse Raju',      40000, '9000066666', '7 Hill Road',    'Hyderabad', 'Telangana',      '500002', 2),
  ('Nurse Divya',     41000, '9000077777', '22 Sea View',    'Mumbai',    'Maharashtra',    '400001', 3);

INSERT INTO Doctor (`E-ID`, `Qualification`, `Sex`) VALUES
  (1, 'MD, DM Cardiology',   'Male'),
  (2, 'MS Ortho',            'Male'),
  (3, 'DM Neurology',        'Male'),
  (4, 'MD Pediatrics',       'Female');

INSERT INTO Nurse (`E-ID`, `License-No`, `Shift`) VALUES
  (5, 'NL-KNL-001', 'Morning'),
  (6, 'NL-HYD-002', 'Evening'),
  (7, 'NL-MUM-003', 'Night');

INSERT INTO Patient (`Name`, `DOB`, `Age`, `Gender`, `Mob-No`, `Blood-Group`) VALUES
  ('Arjun Reddy',    '1990-05-12', 34, 'Male',   '9876543210', 'O+'),
  ('Priya Sharma',   '1985-11-23', 39, 'Female', '9123456780', 'B+'),
  ('Ravi Kumar',     '2000-03-08', 24, 'Male',   '9988776655', 'A+'),
  ('Lakshmi Devi',   '1972-07-30', 52, 'Female', '8877665544', 'AB+'),
  ('Kiran Patel',    '1995-09-15', 29, 'Male',   '9112233445', 'O-'),
  ('Sunita Rao',     '1968-02-18', 56, 'Female', '9223344556', 'B-');

INSERT INTO Rooms (`Type`, `Capacity`, `Availability`, `Floor`, `Daily-Rate`) VALUES
  ('General',      6, 1, 1, 800.00),
  ('ICU',          2, 1, 2, 5000.00),
  ('Private',      1, 0, 3, 3500.00),
  ('Semi-Private', 2, 1, 2, 2000.00),
  ('Emergency',    4, 1, 1, 1500.00);

INSERT INTO Medication (`Name`, `Dosage-Form`, `Sup-ID`, `Unit-Price`, `Stock-Qty`) VALUES
  ('Aspirin',       'Tablet',  1, 12.50,  500),
  ('Lisinopril',    'Tablet',  2, 45.00,  300),
  ('Metformin',     'Tablet',  3, 28.00,  450),
  ('Amoxicillin',   'Capsule', 4, 62.00,  200),
  ('Ibuprofen',     'Tablet',  1, 18.00,  600),
  ('Omeprazole',    'Capsule', 5, 35.00,  350),
  ('Atorvastatin',  'Tablet',  4, 52.00,  280),
  ('Cetirizine',    'Tablet',  3, 22.00,  420);

INSERT INTO Appointment (`P-ID`, `D-E-ID`, `R-ID`, `Scheduled-At`, `Status`, `Notes`) VALUES
  (1, 1, 1, '2026-04-20 09:00:00', 'Scheduled',  'Routine cardiac checkup'),
  (2, 2, 2, '2026-04-21 10:30:00', 'Completed',  'Post-surgery follow-up'),
  (3, 1, NULL, '2026-04-22 14:00:00', 'Scheduled', 'Initial consultation'),
  (4, 2, 1, '2026-04-23 11:00:00', 'Scheduled',  'Orthopedic examination'),
  (5, 3, 3, '2026-04-24 09:30:00', 'Cancelled',  'Neurological evaluation'),
  (6, 4, NULL, '2026-04-25 15:00:00', 'Scheduled', 'Pediatric assessment');

INSERT INTO Bill (`P-ID`, `A-ID`, `Amount`, `Status`, `Notes`) VALUES
  (1, 1, 3200.00, 'Pending', 'Consultation + Room charges'),
  (2, 2, 8500.00, 'Paid',    'Surgery follow-up + ICU'),
  (3, 3, 1200.00, 'Pending', 'Consultation fee'),
  (4, 4, 2800.00, 'Pending', 'Ortho examination'),
  (5, 5, 500.00,  'Cancelled','Cancelled appointment'),
  (6, 6, 1000.00, 'Pending', 'Pediatric assessment');

INSERT INTO Prescription (`P-ID`, `D-E-ID`, `Created-At`, `Notes`) VALUES
  (1, 1, '2026-04-18 09:30:00', 'Post-consultation prescription for heart health'),
  (2, 2, '2026-04-17 14:00:00', 'Pain management post-surgery'),
  (3, 1, '2026-04-19 10:00:00', 'Initial treatment plan'),
  (4, 2, '2026-04-16 15:30:00', 'Inflammation and pain relief');

INSERT INTO PrescriptionItem (`PR-ID`, `MED-ID`, `Dosage`, `Instructions`) VALUES
  (1, 1, '100 mg', 'Once daily after breakfast'),
  (1, 2, '10 mg',  'Once daily in the evening'),
  (2, 5, '400 mg', 'Every 6 hours with food'),
  (2, 6, '20 mg',  'Once daily before meals'),
  (3, 3, '500 mg', 'Twice daily with meals'),
  (3, 8, '10 mg',  'Once daily at bedtime'),
  (4, 5, '600 mg', 'Every 8 hours with food'),
  (4, 7, '20 mg',  'Once daily in the evening');
