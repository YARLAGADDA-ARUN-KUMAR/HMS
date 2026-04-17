# HMS — Hospital Management System

A full-stack Hospital Management System built with Node.js, Express, MySQL, and vanilla JavaScript. Manage patients, doctors, rooms, appointments, prescriptions, and medications efficiently.

---

## 📁 Project Structure

```
HMS/
├── client/
│   ├── index.html       ← Main UI with multi-section dashboard
│   ├── style.css        ← Dark theme responsive styles
│   └── script.js        ← Fetch-based API client with CRUD operations
├── server/
│   ├── server.js        ← Express REST API (Node.js)
│   ├── schema.sql       ← MySQL schema + seed data
│   └── package.json     ← Node.js dependencies
└── README.md            ← This file
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v14+)
- MySQL (v5.7+)
- npm

### 1. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Run the schema (creates DB, tables, and sample data)
mysql -u root -p < server/schema.sql

# Verify: List tables in hospital_db
USE hospital_db;
SHOW TABLES;
```

Sample data includes:

- 4 Patients
- 2 Doctors (Cardiology & Orthopedics)
- 4 Rooms (General, ICU, Private, Semi-Private)
- 4 Appointments
- 8 Medications
- 4 Prescriptions with 8 prescription items

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Update MySQL credentials in server.js (line ~15) if needed:
#   host: 'localhost'
#   user: 'root'
#   password: 'your_password'  ← Update this
#   database: 'hospital_db'

# Start the development server
npm run dev
# → API running at http://localhost:3000

# Or start with node directly:
npm start
```

### 3. Frontend

```bash
# Open in browser (from HMS root directory)
# Method 1: Open directly
open client/index.html

# Method 2: Use VS Code Live Server or similar
# Make sure the backend is running on http://localhost:3000
```

**Note:** The frontend communicates with the backend via REST API, so the server must be running.

---

## 📡 API Endpoints

### Core Resources

| Resource      | GET all                | GET one                    | POST                    | PUT                        | DELETE                        |
| ------------- | ---------------------- | -------------------------- | ----------------------- | -------------------------- | ----------------------------- |
| Patients      | GET /api/patients      | GET /api/patients/:id      | POST /api/patients      | PUT /api/patients/:id      | DELETE /api/patients/:id      |
| Doctors       | GET /api/doctors       | GET /api/doctors/:id       | POST /api/doctors       | PUT /api/doctors/:id       | DELETE /api/doctors/:id       |
| Rooms         | GET /api/rooms         | GET /api/rooms/:id         | POST /api/rooms         | PUT /api/rooms/:id         | DELETE /api/rooms/:id         |
| Appointments  | GET /api/appointments  | GET /api/appointments/:id  | POST /api/appointments  | PUT /api/appointments/:id  | DELETE /api/appointments/:id  |
| Prescriptions | GET /api/prescriptions | GET /api/prescriptions/:id | POST /api/prescriptions | PUT /api/prescriptions/:id | DELETE /api/prescriptions/:id |
| Medications   | GET /api/medications   | GET /api/medications/:id   | POST /api/medications   | PUT /api/medications/:id   | DELETE /api/medications/:id   |

### Prescription Items (Nested Resource)

| Operation                           | Endpoint                                   | Method |
| ----------------------------------- | ------------------------------------------ | ------ |
| Get all items in prescription       | GET /api/prescriptions/:id/items           | GET    |
| Add medication to prescription      | POST /api/prescriptions/:id/items          | POST   |
| Remove medication from prescription | DELETE /api/prescriptions/:id/items/:medId | DELETE |

---

## 🗄️ Database Schema

### Core Tables

#### Patient

- `P-ID` (INT, PK)
- `Name` (VARCHAR)
- `DOB` (DATE)
- `Age` (TINYINT)
- `Gender` (ENUM: Male, Female, Other)
- `Mob-No` (CHAR)

#### Employee (Supertype)

- `E-ID` (INT, PK)
- `Name` (VARCHAR)
- `Salary` (DECIMAL)
- `Mob-No` (CHAR)
- `Address`, `City`, `State`, `Pin-no` (VARCHAR)

#### Doctor (ISA relationship with Employee)

- `E-ID` (INT, PK, FK)
- `Dept` (VARCHAR)
- `Qualification` (VARCHAR)
- `Sex` (ENUM: Male, Female, Other)

#### Rooms

- `R-ID` (INT, PK)
- `Type` (VARCHAR)
- `Capacity` (TINYINT)
- `Availability` (TINYINT, Boolean)

#### Appointment

- `A-ID` (INT, PK)
- `P-ID` (INT, FK → Patient)
- `D-E-ID` (INT, FK → Doctor)
- `R-ID` (INT, FK → Rooms, optional)
- `Scheduled-At` (DATETIME)
- `Status` (ENUM: Scheduled, Completed, Cancelled)
- `Notes` (VARCHAR)

#### Medication

- `MED-ID` (INT, PK)
- `Name` (VARCHAR, UNIQUE)
- `Dosage-Form` (VARCHAR)
- `Manufacturer` (VARCHAR)

#### Prescription

- `PR-ID` (INT, PK)
- `P-ID` (INT, FK → Patient)
- `D-E-ID` (INT, FK → Doctor)
- `Created-At` (DATETIME)
- `Notes` (VARCHAR)

#### PrescriptionItem (M:N between Prescription & Medication)

- `PR-ID` (INT, PK, FK)
- `MED-ID` (INT, PK, FK)
- `Dosage` (VARCHAR)
- `Instructions` (VARCHAR)

#### Junction Tables

- **Consults**: M:N relationship between Patient ↔ Doctor
- **Assigned**: Patient → Room assignment

---

## 🎨 Features

✅ **Patient Management**

- Add, view, update, delete patient records
- Track patient demographics (DOB, Age, Gender, Contact)

✅ **Doctor Management**

- Employee-Doctor inheritance model
- Department and qualification tracking
- Full CRUD operations

✅ **Room Management**

- Track room types and capacity
- Monitor room availability

✅ **Appointment Scheduling**

- Link patients with doctors and rooms
- Track appointment status (Scheduled, Completed, Cancelled)
- Include appointment notes

✅ **Medication Catalog**

- Maintain medication database
- Track dosage forms and manufacturers

✅ **Prescription Management**

- Create prescriptions linked to patients and doctors
- Add multiple medications to a single prescription
- Specify dosage and instructions for each medication
- Complete prescription item management (add/remove medications)

✅ **Responsive UI**

- Dark theme dashboard
- Multi-section navigation
- Real-time data updates
- Form-based CRUD operations

---

## 🔧 Technology Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Frontend  | HTML5, CSS3, Vanilla JavaScript |
| Backend   | Node.js, Express.js             |
| Database  | MySQL (InnoDB)                  |
| API Style | RESTful                         |

---

## 💾 Sample Data

The `schema.sql` file includes seed data:

- **4 Patients**: Diverse demographics for testing
- **2 Doctors**: Cardiology and Orthopedics departments
- **4 Rooms**: Various room types
- **4 Appointments**: Connected to patients and doctors
- **8 Medications**: Common pharmaceutical drugs
- **4 Prescriptions**: With medication assignments

---

## 📝 Notes

- The backend uses MySQL connection pooling for efficiency
- All table names use backticks to handle hyphens in column names
- Foreign key constraints ensure referential integrity
- Transactions are used for multi-table doctor operations
- CORS is enabled for frontend-backend communication
