-- ============================================================
--  MediCore — Hospital Management System (8 Core Entities)
--  All tables normalized to Third Normal Form (3NF)
-- ============================================================

DROP DATABASE IF EXISTS hospital_db;
CREATE DATABASE hospital_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hospital_db;

-- ── 1. Department ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Department (
  `Dept-ID`    INT          AUTO_INCREMENT PRIMARY KEY,
  `Name`       VARCHAR(100) NOT NULL UNIQUE,
  `Description` VARCHAR(300),
  `Head-Count`  TINYINT UNSIGNED DEFAULT 0
) ENGINE=InnoDB;

-- ── 2. Doctor ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Doctor (
  `E-ID`          INT          AUTO_INCREMENT PRIMARY KEY,
  `Name`          VARCHAR(100) NOT NULL,
  `Qualification` VARCHAR(100),
  `Sex`           ENUM('Male','Female','Other'),
  `Salary`        DECIMAL(10,2),
  `Mob-No`        CHAR(10),
  `City`          VARCHAR(80),
  `State`         VARCHAR(80),
  `Dept-ID`       INT,
  FOREIGN KEY (`Dept-ID`) REFERENCES Department(`Dept-ID`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 3. Patient ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Patient (
  `P-ID`   INT          AUTO_INCREMENT PRIMARY KEY,
  `Name`   VARCHAR(100) NOT NULL,
  `DOB`    DATE,
  `Age`    TINYINT UNSIGNED,
  `Gender` ENUM('Male','Female','Other'),
  `Mob-No` CHAR(10),
  `Blood-Group` VARCHAR(5)
) ENGINE=InnoDB;

-- ── 4. Room ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Room (
  `R-ID`        INT          AUTO_INCREMENT PRIMARY KEY,
  `Type`        VARCHAR(50),
  `Capacity`    TINYINT UNSIGNED,
  `Availability` TINYINT(1)  DEFAULT 1,
  `Floor`       TINYINT UNSIGNED DEFAULT 1,
  `Daily-Rate`  DECIMAL(8,2) DEFAULT 0.00
) ENGINE=InnoDB;

-- ── 5. Appointment ──────────────────────────────────────────────
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
  FOREIGN KEY (`R-ID`)   REFERENCES Room(`R-ID`)     ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 6. Medication ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Medication (
  `MED-ID`      INT          AUTO_INCREMENT PRIMARY KEY,
  `Name`        VARCHAR(120) NOT NULL UNIQUE,
  `Dosage-Form` VARCHAR(80),
  `Supplier`    VARCHAR(120),
  `Unit-Price`  DECIMAL(8,2) DEFAULT 0.00,
  `Stock-Qty`   INT          DEFAULT 0
) ENGINE=InnoDB;

-- ── 7. Prescription ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Prescription (
  `PR-ID`      INT  AUTO_INCREMENT PRIMARY KEY,
  `P-ID`       INT  NOT NULL,
  `D-E-ID`     INT  NOT NULL,
  `Created-At` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `Notes`      VARCHAR(500),
  FOREIGN KEY (`P-ID`)   REFERENCES Patient(`P-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`D-E-ID`) REFERENCES Doctor(`E-ID`)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 7.1 PrescriptionItem (M:N Prescription × Medication) ─────────
CREATE TABLE IF NOT EXISTS PrescriptionItem (
  `PR-ID`        INT          NOT NULL,
  `MED-ID`       INT          NOT NULL,
  `Dosage`       VARCHAR(100) NOT NULL,
  `Instructions` VARCHAR(200),
  PRIMARY KEY (`PR-ID`, `MED-ID`),
  FOREIGN KEY (`PR-ID`)  REFERENCES Prescription(`PR-ID`) ON DELETE CASCADE,
  FOREIGN KEY (`MED-ID`) REFERENCES Medication(`MED-ID`)  ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 8. Bill ─────────────────────────────────────────────────────
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

-- ════════════════════════════════════════════════════════════
--  INDEXES, VIEWS, PROCEDURES, TRIGGERS
-- ════════════════════════════════════════════════════════════

-- Indexes for performance
CREATE INDEX idx_patient_name ON Patient(Name);
CREATE INDEX idx_doctor_name ON Doctor(Name);
CREATE INDEX idx_appointment_date ON Appointment(`Scheduled-At`);

-- Views
CREATE VIEW ActiveAppointments AS
SELECT a.`A-ID`, p.Name AS PatientName, d.Name AS DoctorName, a.`Scheduled-At`
FROM Appointment a
JOIN Patient p ON a.`P-ID` = p.`P-ID`
JOIN Doctor d ON a.`D-E-ID` = d.`E-ID`
WHERE a.Status = 'Scheduled';

CREATE VIEW PendingBills AS
SELECT b.`Bill-ID`, p.Name AS PatientName, b.Amount, b.`Issued-At`
FROM Bill b
JOIN Patient p ON b.`P-ID` = p.`P-ID`
WHERE b.Status = 'Pending';

-- Procedures
DELIMITER //
CREATE PROCEDURE CompleteAppointmentAndBill (IN appt_id INT, IN bill_amount DECIMAL(10,2))
BEGIN
  DECLARE patient_id INT;
  
  -- Use transaction
  START TRANSACTION;
  
  -- Update appointment status
  UPDATE Appointment SET Status = 'Completed' WHERE `A-ID` = appt_id;
  
  -- Get Patient ID
  SELECT `P-ID` INTO patient_id FROM Appointment WHERE `A-ID` = appt_id;
  
  -- Generate Bill
  INSERT INTO Bill (`P-ID`, `A-ID`, `Amount`, `Status`, `Notes`)
  VALUES (patient_id, appt_id, bill_amount, 'Pending', 'Auto-generated bill for appointment completion');
  
  COMMIT;
END //
DELIMITER ;

-- Triggers
DELIMITER //
CREATE TRIGGER UpdateRoomAvailAfterAppt
AFTER INSERT ON Appointment
FOR EACH ROW
BEGIN
  IF NEW.`R-ID` IS NOT NULL THEN
    UPDATE Room SET Availability = 0 WHERE `R-ID` = NEW.`R-ID`;
  END IF;
END //
DELIMITER ;

-- ════════════════════════════════════════════════════════════
--  SAMPLE DATA
-- ════════════════════════════════════════════════════════════

INSERT INTO Department (`Name`, `Description`, `Head-Count`) VALUES
  ('Cardiology',   'Heart and cardiovascular care', 2),
  ('Orthopedics',  'Bone, joint and muscle treatment', 2),
  ('Neurology',    'Brain and nervous system disorders', 1),
  ('Pediatrics',   'Medical care for infants and children', 1),
  ('Radiology',    'Imaging and diagnostic services', 0);

INSERT INTO Doctor (`Name`, `Qualification`, `Sex`, `Salary`, `Mob-No`, `City`, `State`, `Dept-ID`) VALUES
  ('Dr. S. Prasad', 'MD, DM Cardiology', 'Male', 95000, '9000011111', 'Kurnool', 'Andhra Pradesh', 1),
  ('Dr. A. Verma',  'MS Ortho',          'Male', 88000, '9000022222', 'Hyderabad', 'Telangana', 2),
  ('Dr. R. Mehta',  'DM Neurology',      'Male', 92000, '9000033333', 'Bangalore', 'Karnataka', 3),
  ('Dr. P. Nair',   'MD Pediatrics',     'Female', 85000, '9000044444', 'Chennai', 'Tamil Nadu', 4);

INSERT INTO Patient (`Name`, `DOB`, `Age`, `Gender`, `Mob-No`, `Blood-Group`) VALUES
  ('Arjun Reddy',    '1990-05-12', 34, 'Male',   '9876543210', 'O+'),
  ('Priya Sharma',   '1985-11-23', 39, 'Female', '9123456780', 'B+'),
  ('Ravi Kumar',     '2000-03-08', 24, 'Male',   '9988776655', 'A+'),
  ('Lakshmi Devi',   '1972-07-30', 52, 'Female', '8877665544', 'AB+');

INSERT INTO Room (`Type`, `Capacity`, `Availability`, `Floor`, `Daily-Rate`) VALUES
  ('General',      6, 1, 1, 800.00),
  ('ICU',          2, 1, 2, 5000.00),
  ('Private',      1, 0, 3, 3500.00),
  ('Semi-Private', 2, 1, 2, 2000.00);

INSERT INTO Medication (`Name`, `Dosage-Form`, `Supplier`, `Unit-Price`, `Stock-Qty`) VALUES
  ('Aspirin',       'Tablet',  'Bayer Pharma', 12.50,  500),
  ('Lisinopril',    'Tablet',  'AstraZeneca India', 45.00,  300),
  ('Metformin',     'Tablet',  'Sun Pharma', 28.00,  450),
  ('Amoxicillin',   'Capsule', 'Cipla Limited', 62.00,  200);

INSERT INTO Appointment (`P-ID`, `D-E-ID`, `R-ID`, `Scheduled-At`, `Status`, `Notes`) VALUES
  (1, 1, 1, '2026-04-20 09:00:00', 'Scheduled',  'Routine cardiac checkup'),
  (2, 2, 2, '2026-04-21 10:30:00', 'Completed',  'Post-surgery follow-up'),
  (3, 1, NULL, '2026-04-22 14:00:00', 'Scheduled', 'Initial consultation'),
  (4, 2, 1, '2026-04-23 11:00:00', 'Scheduled',  'Orthopedic examination');

INSERT INTO Bill (`P-ID`, `A-ID`, `Amount`, `Status`, `Notes`) VALUES
  (1, 1, 3200.00, 'Pending', 'Consultation + Room charges'),
  (2, 2, 8500.00, 'Paid',    'Surgery follow-up + ICU'),
  (3, 3, 1200.00, 'Pending', 'Consultation fee'),
  (4, 4, 2800.00, 'Pending', 'Ortho examination');

INSERT INTO Prescription (`P-ID`, `D-E-ID`, `Created-At`, `Notes`) VALUES
  (1, 1, '2026-04-18 09:30:00', 'Post-consultation prescription for heart health'),
  (2, 2, '2026-04-17 14:00:00', 'Pain management post-surgery');

INSERT INTO PrescriptionItem (`PR-ID`, `MED-ID`, `Dosage`, `Instructions`) VALUES
  (1, 1, '100 mg', 'Once daily after breakfast'),
  (1, 2, '10 mg',  'Once daily in the evening'),
  (2, 3, '400 mg', 'Every 6 hours with food');
