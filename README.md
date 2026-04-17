# MediCore — Hospital Management System

A full-stack Hospital Management System built from the ER diagram.

---

## Project Structure

```
hospital/
├── client/
│   ├── index.html   ← Main UI
│   ├── style.css    ← Dark theme styles
│   └── script.js    ← Fetch-based API client
└── server/
    ├── server.js    ← Express REST API
    ├── schema.sql   ← MySQL schema + seed data
    └── package.json
```

---

## Quick Start

### 1. MySQL Setup

```bash
# Login to MySQL
mysql -u root -p

# Run the schema (creates DB, tables, and sample data)
mysql -u root -p < server/schema.sql
```

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Edit server.js — update your MySQL password on line 15:
#   password: 'your_password'

# Start the server
npm start
# → API running at http://localhost:3000
```

### 3. Frontend

Open `client/index.html` directly in a browser.
> The frontend calls `http://localhost:3000/api/...` so the backend must be running.

---

## API Endpoints

| Resource       | GET all                | GET one                 | POST                           | PUT                     | DELETE                    |
|----------------|------------------------|-------------------------|--------------------------------|-------------------------|---------------------------|
| Patients       | GET /api/patients      | GET /api/patients/:id   | POST /api/patients             | PUT /api/patients/:id   | DELETE /api/patients/:id  |
| Doctors        | GET /api/doctors       | GET /api/doctors/:id    | POST /api/doctors              | PUT /api/doctors/:id    | DELETE /api/doctors/:id   |
| Rooms          | GET /api/rooms         | GET /api/rooms/:id      | POST /api/rooms                | PUT /api/rooms/:id      | DELETE /api/rooms/:id     |
| Appointments   | GET /api/appointments  | GET /api/appointments/:id| POST /api/appointments        | PUT /api/appointments/:id| DELETE /api/appointments/:id|
| Prescriptions  | GET /api/prescriptions | GET /api/prescriptions/:id| POST /api/prescriptions      | PUT /api/prescriptions/:id| DELETE /api/prescriptions/:id|
| Medications    | GET /api/medications   | GET /api/medications/:id| POST /api/medications          | PUT /api/medications/:id| DELETE /api/medications/:id |

---

## ER Diagram Entities Covered

| Entity         | Table(s)                      | Notes                                  |
|----------------|-------------------------------|----------------------------------------|
| Patient        | Patient                       | Full CRUD                              |
| Employee       | Employee                      | Supertype for Doctor                   |
| Doctor         | Doctor                        | ISA relationship via join with Employee|
| Rooms          | Rooms                         | Full CRUD                              |
| Consults       | Consults                      | M:N Patient ↔ Doctor                   |
| Assigned       | Assigned                      | Patient → Room                         |
| Appointment    | Appointment                   | Linked to Patient, Doctor & Room       |
| Prescription   | Prescription, Medication      | Prescription details & Prescribed drugs|
| Rx Items       | PrescriptionItem              | M:N Prescription ↔ Medication          |
