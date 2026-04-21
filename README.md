# MediCore HMS — Hospital Management System

A full-stack, comprehensive Hospital Management System built with Node.js, Express, MySQL, and vanilla JavaScript. Featuring a premium dark glassmorphism UI, real-time analytics, and a rock-solid relational database foundation.

---

## 🎯 Database Management Systems (DBMS) Core Concepts

This project serves as a practical implementation of advanced **Database Management System (DBMS)** principles. It heavily focuses on data integrity, relational mapping, and normalization.

### 1. Database Normalization (3rd Normal Form - 3NF)
The schema has been thoroughly normalized up to the **3rd Normal Form (3NF)** to eliminate redundancy and prevent insertion, update, and deletion anomalies.
*   **1NF & 2NF:** All tables have atomic values, primary keys, and no partial dependencies on composite keys.
*   **3NF Implementation:** Removed all transitive dependencies. Previously string-based attributes like `Doctor.Dept` and `Medication.Manufacturer` were extracted into their own independent entities: **`Department`** and **`Supplier`**. Now, entities reference them strictly via Foreign Keys (`Dept-ID` and `Sup-ID`), ensuring updates to a department or supplier name cascade uniformly across the system.

### 2. Supertype / Subtype (ISA) Hierarchy
The system successfully models inheritance in a relational database using the **Supertype / Subtype (ISA)** pattern.
*   **Supertype:** `Employee` (storing shared attributes: `E-ID`, Name, Salary, Contact, Address).
*   **Subtypes:** `Doctor` and `Nurse`. 
*   **Mechanism:** Both sub-entities use `E-ID` as both their Primary Key and Foreign Key referencing the `Employee` table. 

### 3. Entity-Relationship (ER) Modeling & Cardinality
The ER mapping incorporates all fundamental relationship types:
*   **1:N (One-to-Many):** One `Patient` can have many `Bill` records. One `Department` has many `Employee` records. One `Supplier` supplies many `Medication` variants.
*   **M:N (Many-to-Many):** `PrescriptionItem` serves as an associative (junction) table resolving the M:N relationship between `Prescription` and `Medication`. `Consults` resolves M:N between `Patient` and `Doctor`.
*   **1:1 (One-to-One):** `Appointment` and `Bill` maintain an optional 1:1 linkage to trace payments strictly back to specific clinical encounters.

### 4. Integrity Constraints
Strict **Referential Integrity** and **Domain Integrity** constraints are enforced at the database schema level.
*   **Foreign Keys (FK):** Enforces entity relationships. We use `ON DELETE CASCADE` (e.g., deleting a patient deletes their bills) and `ON DELETE SET NULL` (e.g., deleting a room clears the room from scheduled appointments without deleting the appointment).
*   **Data Validation:** `UNIQUE` keys, `ENUM` constraints (Shift, Status, Gender), and `UNSIGNED` integers are utilized to prevent anomalous data writes.

### 5. ACID Properties & Transaction Management
*   **Atomicity:** Creating new inherited entities (like a Doctor or Nurse) requires inserting data into both `Employee` and `Doctor`/`Nurse` tables. The server uses explicit **MySQL Transactions** (`CONNECTION.beginTransaction()`, `COMMIT`, `ROLLBACK`) to guarantee atomicity.
*   **Consistency:** The database seamlessly transitions from one valid state to another.
*   **Isolation & Durability:** Supported implicitly by the default InnoDB storage engine.

---

## 🗄️ Database Schema Directory

### 11 Core Entities + Associative Tables

#### Staff Management
*   **Employee**: `E-ID` (PK), Name, Salary, Contact Info, `Dept-ID` (FK).
*   **Doctor**: `E-ID` (PK/FK), Qualification, Sex.
*   **Nurse**: `E-ID` (PK/FK), License-No, Shift.
*   **Department**: `Dept-ID` (PK), Name, Description, Head-Count.

#### Patient & Operations Management
*   **Patient**: `P-ID` (PK), Name, DOB, Age, Gender, Blood-Group, Contact Info.
*   **Appointment**: `A-ID` (PK), `P-ID` (FK), `D-E-ID` (FK), `R-ID` (FK), Scheduled-At, Status.
*   **Rooms**: `R-ID` (PK), Type, Capacity, Floor, Daily-Rate, Availability.
*   **Bill**: `Bill-ID` (PK), `P-ID` (FK), `A-ID` (FK), Amount, Status, Issued-At.

#### Clinical & Inventory Management
*   **Medication**: `MED-ID` (PK), Name, Dosage-Form, `Sup-ID` (FK), Unit-Price, Stock-Qty.
*   **Prescription**: `PR-ID` (PK), `P-ID` (FK), `D-E-ID` (FK), Created-At, Notes.
*   **PrescriptionItem (M:N Associative)**: `PR-ID` (PK/FK), `MED-ID` (PK/FK), Dosage, Instructions.
*   **Supplier**: `Sup-ID` (PK), Name, Contact, Email, Address.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MySQL (v5.7+ or v8.0+)
- npm

### 1. Database Setup
```bash
# Login to MySQL
mysql -u root -p

# Run the 3NF schema (creates DB, tables, and sample data)
mysql -u root -p < server/schema.sql
```

### 2. Backend Setup
```bash
cd server
npm install

# Update the database password on lines 16 & 21 in server/server.js if needed.
# Start the development server
npm run dev
# OR
node server.js
```

### 3. Frontend Application
Because the frontend runs a premium UI utilizing modular CSS variables and a heavy ES6 script logic architecture, it is best served via a Live Server, or by directly opening the file:
```bash
# Double click the file or open it in the browser:
file://<path-to-project>/client/index.html
```

---

## 🎨 Frontend UI / UX Overhaul
The application features a fully modernized interface:
*   **Dark Glassmorphism Theme:** Provides a high-end, premium look with deep contrasts and responsive elements.
*   **Analytics Grid:** Every section incorporates visual progress bars, metrics, and KPI statistic cards directly linked to aggregated MySQL dashboard counts.
*   **Dynamic Layout:** Incorporates a collapsible sidebar with micro-animations and instantaneous client-side searching / table filtering.
*   **Modular Modals:** Reusable, fully populated drop-down mapping (using active backend queries instead of hardcodes) for intuitive CRUD workflows.

---

## 🔧 Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom Variables / Grid / Flex / Glassmorphism) |
| **Backend** | Express.js (Node.js REST API), JSON Web Token (JWT) Authentication |
| **Database** | MySQL (InnoDB Engine), `mysql2/promise` connection pooling |

---

## 📡 Core API Coverage
The Express server securely exposes routes behind Bearer JWT verification for reading and mutating database states.

*   **Auth:** `/api/auth/login`
*   **Dashboards:** `/api/dashboard`
*   **CRUD Routes:** Completely standard mapping across all entities. 
    *   *Examples:* `/api/patients`, `/api/doctors`, `/api/nurses`, `/api/departments`, `/api/bills`, `/api/suppliers`, `/api/medications`, `/api/prescriptions`, `/api/rooms`, `/api/appointments`.

*Note: All endpoints implement resilient server-side crash guarding and return appropriate JSON HTTP error statuses.*
