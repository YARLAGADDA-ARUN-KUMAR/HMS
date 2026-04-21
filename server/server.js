const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'hospital-management-secret-key-2026';

const app = express();
app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

/* ── DB Pool ─────────────────────────────────────────────────
   Update host/user/password to match your MySQL setup.
──────────────────────────────────────────────────────────── */
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'ARUN0123L',
  database: 'hospital_db',
  waitForConnections: true,
  connectionLimit: 10,
});

const q = (sql, params = []) => pool.execute(sql, params);

/* ── Auth ──────────────────────────────────────────────────── */
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { username, role: 'admin' } });
});

app.post('/api/auth/logout', (_req, res) => res.json({ ok: true }));

function authMiddleware(req, res, next) {
  if (req.path === '/auth/login' || req.path === '/auth/logout') return next();
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}
app.use('/api', authMiddleware);

/* ════════════════════════════════════════════════════════════
   DASHBOARD ANALYTICS
════════════════════════════════════════════════════════════ */
app.get('/api/dashboard', async (req, res) => {
  try {
    const [[patients]] = await q('SELECT COUNT(*) AS cnt FROM Patient');
    const [[doctors]]  = await q('SELECT COUNT(*) AS cnt FROM Doctor');
    const [[rooms]]    = await q('SELECT COUNT(*) AS cnt FROM Rooms');
    const [[nurses]]   = await q('SELECT COUNT(*) AS cnt FROM Nurse');
    const [[bills]]    = await q('SELECT COUNT(*) AS cnt FROM Bill');
    const [[depts]]    = await q('SELECT COUNT(*) AS cnt FROM Department');
    const [[suppliers]]   = await q('SELECT COUNT(*) AS cnt FROM Supplier');
    const [[appointments]] = await q('SELECT COUNT(*) AS cnt FROM Appointment');
    const [[medications]]  = await q('SELECT COUNT(*) AS cnt FROM Medication');

    const [[pendingBills]] = await q("SELECT COUNT(*) AS cnt FROM Bill WHERE Status='Pending'");
    const [[totalRevenue]] = await q("SELECT COALESCE(SUM(Amount),0) AS total FROM Bill WHERE Status='Paid'");
    const [[availRooms]]   = await q("SELECT COUNT(*) AS cnt FROM Rooms WHERE Availability=1");
    const [[scheduledApt]] = await q("SELECT COUNT(*) AS cnt FROM Appointment WHERE Status='Scheduled'");
    const [[lowStock]]     = await q('SELECT COUNT(*) AS cnt FROM Medication WHERE `Stock-Qty` < 100');

    // Recent patients
    const [recentPatients] = await q('SELECT `P-ID`,Name,Age,Gender,`Blood-Group` FROM Patient ORDER BY `P-ID` DESC LIMIT 5');
    // Appointments by status
    const [aptByStatus] = await q(`
      SELECT Status, COUNT(*) AS cnt FROM Appointment GROUP BY Status
    `);
    // Rooms by type
    const [roomsByType] = await q(`
      SELECT Type, COUNT(*) AS cnt, SUM(Availability) AS avail FROM Rooms GROUP BY Type
    `);
    // Bills by status
    const [billsByStatus] = await q('SELECT Status, COUNT(*) AS cnt, SUM(Amount) AS total FROM Bill GROUP BY Status');
    // Dept headcount
    const [deptStats] = await q('SELECT `Name`, `Head-Count` FROM Department ORDER BY `Head-Count` DESC');
    const [upcomingAppointments] = await q(`
      SELECT a.\`A-ID\`, p.Name AS PatientName, e.Name AS DoctorName, a.\`Scheduled-At\`, a.Status
      FROM Appointment a
      JOIN Patient p ON a.\`P-ID\`=p.\`P-ID\`
      JOIN Doctor dr ON a.\`D-E-ID\`=dr.\`E-ID\`
      JOIN Employee e ON dr.\`E-ID\`=e.\`E-ID\`
      ORDER BY a.\`Scheduled-At\` DESC LIMIT 5
    `);

    res.json({
      counts: {
        patients: patients.cnt, doctors: doctors.cnt, rooms: rooms.cnt,
        nurses: nurses.cnt, bills: bills.cnt, departments: depts.cnt,
        suppliers: suppliers.cnt, appointments: appointments.cnt,
        medications: medications.cnt, lowStock: lowStock.cnt,
        pendingBills: pendingBills.cnt, totalRevenuePaid: totalRevenue.total,
        availableRooms: availRooms.cnt, scheduledAppointments: scheduledApt.cnt,
      },
      recentPatients,
      aptByStatus,
      roomsByType,
      billsByStatus,
      deptStats,
      upcomingAppointments,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ════════════════════════════════════════════════════════════
   DEPARTMENTS  (New Entity)
════════════════════════════════════════════════════════════ */
app.get('/api/departments', async (req, res) => {
  const [rows] = await q('SELECT * FROM Department ORDER BY `Dept-ID` ASC');
  res.json(rows);
});

app.get('/api/departments/:id', async (req, res) => {
  const [rows] = await q('SELECT * FROM Department WHERE `Dept-ID`=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/departments', async (req, res) => {
  try {
    const { Name, Description, 'Head-Count': hc } = req.body;
    if (!Name) return res.status(400).json({ error: 'Name is required' });
    const [r] = await q(
      'INSERT INTO Department (Name, Description, `Head-Count`) VALUES (?,?,?)',
      [Name, Description || null, hc || 0]
    );
    res.json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Department name already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/departments/:id', async (req, res) => {
  try {
    const { Name, Description, 'Head-Count': hc } = req.body;
    await q(
      'UPDATE Department SET Name=?, Description=?, `Head-Count`=? WHERE `Dept-ID`=?',
      [Name, Description || null, hc || 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/departments/:id', async (req, res) => {
  await q('DELETE FROM Department WHERE `Dept-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════════════════
   SUPPLIERS  (New Entity)
════════════════════════════════════════════════════════════ */
app.get('/api/suppliers', async (req, res) => {
  const [rows] = await q('SELECT * FROM Supplier ORDER BY `Sup-ID` ASC');
  res.json(rows);
});

app.get('/api/suppliers/:id', async (req, res) => {
  const [rows] = await q('SELECT * FROM Supplier WHERE `Sup-ID`=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const { Name, ContactNo, Email, Address, City, State } = req.body;
    if (!Name) return res.status(400).json({ error: 'Name is required' });
    const [r] = await q(
      'INSERT INTO Supplier (Name, ContactNo, Email, Address, City, State) VALUES (?,?,?,?,?,?)',
      [Name, ContactNo || null, Email || null, Address || null, City || null, State || null]
    );
    res.json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Supplier already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { Name, ContactNo, Email, Address, City, State } = req.body;
    await q(
      'UPDATE Supplier SET Name=?, ContactNo=?, Email=?, Address=?, City=?, State=? WHERE `Sup-ID`=?',
      [Name, ContactNo || null, Email || null, Address || null, City || null, State || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  await q('DELETE FROM Supplier WHERE `Sup-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════════════════
   PATIENTS
════════════════════════════════════════════════════════════ */
app.get('/api/patients', async (req, res) => {
  const [rows] = await q('SELECT * FROM Patient ORDER BY `P-ID` DESC');
  res.json(rows);
});

app.get('/api/patients/:id', async (req, res) => {
  const [rows] = await q('SELECT * FROM Patient WHERE `P-ID`=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/patients', async (req, res) => {
  try {
    const { Name, DOB, Age, Gender, 'Mob-No': MobNo, 'Blood-Group': BG } = req.body;
    const [r] = await q(
      'INSERT INTO Patient (Name, DOB, Age, Gender, `Mob-No`, `Blood-Group`) VALUES (?,?,?,?,?,?)',
      [Name, DOB || null, Age || null, Gender || null, MobNo || null, BG || null]
    );
    res.json({ id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/patients/:id', async (req, res) => {
  try {
    const { Name, DOB, Age, Gender, 'Mob-No': MobNo, 'Blood-Group': BG } = req.body;
    await q(
      'UPDATE Patient SET Name=?, DOB=?, Age=?, Gender=?, `Mob-No`=?, `Blood-Group`=? WHERE `P-ID`=?',
      [Name, DOB || null, Age || null, Gender || null, MobNo || null, BG || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/patients/:id', async (req, res) => {
  await q('DELETE FROM Patient WHERE `P-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════════════════
   DOCTORS  (Employee ISA)
════════════════════════════════════════════════════════════ */
app.get('/api/doctors', async (req, res) => {
  const [rows] = await q(`
    SELECT e.\`E-ID\`, e.Name, e.Salary, e.\`Mob-No\`, e.Address, e.City, e.State, e.\`Pin-no\`,
           d.Qualification, d.Sex,
           e.\`Dept-ID\`, dep.Name AS DeptName
    FROM Employee e
    JOIN Doctor d ON e.\`E-ID\`=d.\`E-ID\`
    LEFT JOIN Department dep ON e.\`Dept-ID\`=dep.\`Dept-ID\`
    ORDER BY e.\`E-ID\` DESC
  `);
  res.json(rows);
});

app.get('/api/doctors/:id', async (req, res) => {
  const [rows] = await q(`
    SELECT e.\`E-ID\`, e.Name, e.Salary, e.\`Mob-No\`, e.Address, e.City, e.State, e.\`Pin-no\`,
           d.Qualification, d.Sex,
           e.\`Dept-ID\`, dep.Name AS DeptName
    FROM Employee e
    JOIN Doctor d ON e.\`E-ID\`=d.\`E-ID\`
    LEFT JOIN Department dep ON e.\`Dept-ID\`=dep.\`Dept-ID\`
    WHERE e.\`E-ID\`=?
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/doctors', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { Name, Salary, 'Mob-No': MobNo, Address, City, State, 'Pin-no': Pin, Sex, Qualification, 'Dept-ID': DeptId } = req.body;
    const [r] = await conn.execute(
      'INSERT INTO Employee (Name, Salary, `Mob-No`, Address, City, State, `Pin-no`, `Dept-ID`) VALUES (?,?,?,?,?,?,?,?)',
      [Name, Salary || null, MobNo || null, Address || null, City || null, State || null, Pin || null, DeptId || null]
    );
    await conn.execute(
      'INSERT INTO Doctor (`E-ID`, Qualification, Sex) VALUES (?,?,?)',
      [r.insertId, Qualification || null, Sex || null]
    );
    await conn.commit();
    res.json({ id: r.insertId });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

app.put('/api/doctors/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { Name, Salary, 'Mob-No': MobNo, Address, City, State, 'Pin-no': Pin, Sex, Qualification, 'Dept-ID': DeptId } = req.body;
    await conn.execute(
      'UPDATE Employee SET Name=?, Salary=?, `Mob-No`=?, Address=?, City=?, State=?, `Pin-no`=?, `Dept-ID`=? WHERE `E-ID`=?',
      [Name, Salary || null, MobNo || null, Address || null, City || null, State || null, Pin || null, DeptId || null, req.params.id]
    );
    await conn.execute(
      'UPDATE Doctor SET Qualification=?, Sex=? WHERE `E-ID`=?',
      [Qualification || null, Sex || null, req.params.id]
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

app.delete('/api/doctors/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM Doctor WHERE `E-ID`=?', [req.params.id]);
    await conn.execute('DELETE FROM Employee WHERE `E-ID`=?', [req.params.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

/* ════════════════════════════════════════════════════════════
   NURSES  (New Entity — ISA Employee)
════════════════════════════════════════════════════════════ */
app.get('/api/nurses', async (req, res) => {
  const [rows] = await q(`
    SELECT e.\`E-ID\`, e.Name, e.Salary, e.\`Mob-No\`, e.City, e.State,
           n.\`License-No\`, n.Shift,
           e.\`Dept-ID\`, dep.Name AS DeptName
    FROM Employee e
    JOIN Nurse n ON e.\`E-ID\`=n.\`E-ID\`
    LEFT JOIN Department dep ON e.\`Dept-ID\`=dep.\`Dept-ID\`
    ORDER BY e.\`E-ID\` DESC
  `);
  res.json(rows);
});

app.get('/api/nurses/:id', async (req, res) => {
  const [rows] = await q(`
    SELECT e.\`E-ID\`, e.Name, e.Salary, e.\`Mob-No\`, e.Address, e.City, e.State, e.\`Pin-no\`,
           n.\`License-No\`, n.Shift,
           e.\`Dept-ID\`, dep.Name AS DeptName
    FROM Employee e
    JOIN Nurse n ON e.\`E-ID\`=n.\`E-ID\`
    LEFT JOIN Department dep ON e.\`Dept-ID\`=dep.\`Dept-ID\`
    WHERE e.\`E-ID\`=?
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/nurses', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { Name, Salary, 'Mob-No': MobNo, Address, City, State, 'Pin-no': Pin, 'License-No': Lic, Shift, 'Dept-ID': DeptId } = req.body;
    const [r] = await conn.execute(
      'INSERT INTO Employee (Name, Salary, `Mob-No`, Address, City, State, `Pin-no`, `Dept-ID`) VALUES (?,?,?,?,?,?,?,?)',
      [Name, Salary || null, MobNo || null, Address || null, City || null, State || null, Pin || null, DeptId || null]
    );
    await conn.execute(
      'INSERT INTO Nurse (`E-ID`, `License-No`, Shift) VALUES (?,?,?)',
      [r.insertId, Lic || null, Shift || 'Morning']
    );
    await conn.commit();
    res.json({ id: r.insertId });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

app.put('/api/nurses/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { Name, Salary, 'Mob-No': MobNo, Address, City, State, 'Pin-no': Pin, 'License-No': Lic, Shift, 'Dept-ID': DeptId } = req.body;
    await conn.execute(
      'UPDATE Employee SET Name=?, Salary=?, `Mob-No`=?, Address=?, City=?, State=?, `Pin-no`=?, `Dept-ID`=? WHERE `E-ID`=?',
      [Name, Salary || null, MobNo || null, Address || null, City || null, State || null, Pin || null, DeptId || null, req.params.id]
    );
    await conn.execute(
      'UPDATE Nurse SET `License-No`=?, Shift=? WHERE `E-ID`=?',
      [Lic || null, Shift || 'Morning', req.params.id]
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

app.delete('/api/nurses/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM Nurse WHERE `E-ID`=?', [req.params.id]);
    await conn.execute('DELETE FROM Employee WHERE `E-ID`=?', [req.params.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

/* ════════════════════════════════════════════════════════════
   ROOMS
════════════════════════════════════════════════════════════ */
app.get('/api/rooms', async (req, res) => {
  const [rows] = await q('SELECT * FROM Rooms ORDER BY `R-ID` DESC');
  res.json(rows);
});

app.get('/api/rooms/:id', async (req, res) => {
  const [rows] = await q('SELECT * FROM Rooms WHERE `R-ID`=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { Type, Capacity, Availability, Floor, 'Daily-Rate': DR } = req.body;
    const [r] = await q(
      'INSERT INTO Rooms (Type, Capacity, Availability, Floor, `Daily-Rate`) VALUES (?,?,?,?,?)',
      [Type, Capacity || 1, Availability ?? 1, Floor || 1, DR || 0]
    );
    res.json({ id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { Type, Capacity, Availability, Floor, 'Daily-Rate': DR } = req.body;
    await q(
      'UPDATE Rooms SET Type=?, Capacity=?, Availability=?, Floor=?, `Daily-Rate`=? WHERE `R-ID`=?',
      [Type, Capacity || 1, Availability ?? 1, Floor || 1, DR || 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/rooms/:id', async (req, res) => {
  await q('DELETE FROM Rooms WHERE `R-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════════════════
   MEDICATIONS
════════════════════════════════════════════════════════════ */
app.get('/api/medications', async (req, res) => {
  const [rows] = await q(`
    SELECT m.\`MED-ID\`, m.Name, m.\`Dosage-Form\`, m.\`Unit-Price\`, m.\`Stock-Qty\`,
           m.\`Sup-ID\`, s.Name AS SupplierName
    FROM Medication m
    LEFT JOIN Supplier s ON m.\`Sup-ID\`=s.\`Sup-ID\`
    ORDER BY m.\`MED-ID\` DESC
  `);
  res.json(rows);
});

app.get('/api/medications/:id', async (req, res) => {
  const [rows] = await q(`
    SELECT m.\`MED-ID\`, m.Name, m.\`Dosage-Form\`, m.\`Unit-Price\`, m.\`Stock-Qty\`,
           m.\`Sup-ID\`, s.Name AS SupplierName
    FROM Medication m
    LEFT JOIN Supplier s ON m.\`Sup-ID\`=s.\`Sup-ID\`
    WHERE m.\`MED-ID\`=?
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/medications', async (req, res) => {
  try {
    const { Name, 'Dosage-Form': DF, 'Sup-ID': SupId, 'Unit-Price': UP, 'Stock-Qty': SQ } = req.body;
    if (!Name) return res.status(400).json({ error: 'Name is required' });
    const [r] = await q(
      'INSERT INTO Medication (Name, `Dosage-Form`, `Sup-ID`, `Unit-Price`, `Stock-Qty`) VALUES (?,?,?,?,?)',
      [Name, DF || null, SupId || null, UP || 0, SQ || 0]
    );
    res.json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Medication name already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/medications/:id', async (req, res) => {
  try {
    const { Name, 'Dosage-Form': DF, 'Sup-ID': SupId, 'Unit-Price': UP, 'Stock-Qty': SQ } = req.body;
    await q(
      'UPDATE Medication SET Name=?, `Dosage-Form`=?, `Sup-ID`=?, `Unit-Price`=?, `Stock-Qty`=? WHERE `MED-ID`=?',
      [Name, DF || null, SupId || null, UP || 0, SQ || 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/medications/:id', async (req, res) => {
  await q('DELETE FROM Medication WHERE `MED-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════════════════
   BILLS  (New Entity)
════════════════════════════════════════════════════════════ */
app.get('/api/bills', async (req, res) => {
  const [rows] = await q(`
    SELECT b.\`Bill-ID\`, b.\`P-ID\`, p.Name AS PatientName,
           b.\`A-ID\`, b.Amount, b.Status, b.\`Issued-At\`, b.\`Paid-At\`, b.Notes
    FROM Bill b
    JOIN Patient p ON b.\`P-ID\`=p.\`P-ID\`
    ORDER BY b.\`Bill-ID\` DESC
  `);
  res.json(rows);
});

app.get('/api/bills/:id', async (req, res) => {
  const [rows] = await q(`
    SELECT b.\`Bill-ID\`, b.\`P-ID\`, p.Name AS PatientName,
           b.\`A-ID\`, b.Amount, b.Status, b.\`Issued-At\`, b.\`Paid-At\`, b.Notes
    FROM Bill b
    JOIN Patient p ON b.\`P-ID\`=p.\`P-ID\`
    WHERE b.\`Bill-ID\`=?
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/bills', async (req, res) => {
  try {
    const { 'P-ID': PId, 'A-ID': AId, Amount, Status, Notes, 'Paid-At': PaidAt } = req.body;
    if (!PId) return res.status(400).json({ error: 'P-ID is required' });
    const [r] = await q(
      'INSERT INTO Bill (`P-ID`, `A-ID`, Amount, Status, Notes, `Paid-At`) VALUES (?,?,?,?,?,?)',
      [PId, AId || null, Amount || 0, Status || 'Pending', Notes || null, PaidAt || null]
    );
    res.json({ id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/bills/:id', async (req, res) => {
  try {
    const { 'P-ID': PId, 'A-ID': AId, Amount, Status, Notes, 'Paid-At': PaidAt } = req.body;
    await q(
      'UPDATE Bill SET `P-ID`=?, `A-ID`=?, Amount=?, Status=?, Notes=?, `Paid-At`=? WHERE `Bill-ID`=?',
      [PId, AId || null, Amount || 0, Status || 'Pending', Notes || null, PaidAt || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/bills/:id', async (req, res) => {
  await q('DELETE FROM Bill WHERE `Bill-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════════════════
   APPOINTMENTS
════════════════════════════════════════════════════════════ */
app.get('/api/appointments', async (req, res) => {
  const [rows] = await q(`
    SELECT a.\`A-ID\`,
           a.\`P-ID\`, p.Name AS PatientName,
           a.\`D-E-ID\`, e.Name AS DoctorName,
           a.\`R-ID\`, r.Type AS RoomType,
           a.\`Scheduled-At\`, a.Status, a.Notes
    FROM Appointment a
    JOIN Patient p ON a.\`P-ID\`=p.\`P-ID\`
    JOIN Doctor d ON a.\`D-E-ID\`=d.\`E-ID\`
    JOIN Employee e ON d.\`E-ID\`=e.\`E-ID\`
    LEFT JOIN Rooms r ON a.\`R-ID\`=r.\`R-ID\`
    ORDER BY a.\`A-ID\` DESC
  `);
  res.json(rows);
});

app.get('/api/appointments/:id', async (req, res) => {
  const [rows] = await q(`
    SELECT a.\`A-ID\`,
           a.\`P-ID\`, p.Name AS PatientName,
           a.\`D-E-ID\`, e.Name AS DoctorName,
           a.\`R-ID\`, r.Type AS RoomType,
           a.\`Scheduled-At\`, a.Status, a.Notes
    FROM Appointment a
    JOIN Patient p ON a.\`P-ID\`=p.\`P-ID\`
    JOIN Doctor d ON a.\`D-E-ID\`=d.\`E-ID\`
    JOIN Employee e ON d.\`E-ID\`=e.\`E-ID\`
    LEFT JOIN Rooms r ON a.\`R-ID\`=r.\`R-ID\`
    WHERE a.\`A-ID\`=?
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { 'P-ID': PId, 'D-E-ID': DEId, 'R-ID': RId, 'Scheduled-At': SA, Status, Notes } = req.body;
    if (!PId || !DEId) return res.status(400).json({ error: 'P-ID and D-E-ID are required' });
    const [r] = await q(
      'INSERT INTO Appointment (`P-ID`,`D-E-ID`,`R-ID`,`Scheduled-At`,Status,Notes) VALUES (?,?,?,?,?,?)',
      [PId, DEId, RId || null, SA || null, Status || 'Scheduled', Notes || null]
    );
    res.json({ id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const { 'P-ID': PId, 'D-E-ID': DEId, 'R-ID': RId, 'Scheduled-At': SA, Status, Notes } = req.body;
    await q(
      'UPDATE Appointment SET `P-ID`=?,`D-E-ID`=?,`R-ID`=?,`Scheduled-At`=?,Status=?,Notes=? WHERE `A-ID`=?',
      [PId, DEId, RId || null, SA || null, Status || 'Scheduled', Notes || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/appointments/:id', async (req, res) => {
  await q('DELETE FROM Appointment WHERE `A-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════════════════
   PRESCRIPTIONS
════════════════════════════════════════════════════════════ */
app.get('/api/prescriptions', async (req, res) => {
  const [rows] = await q(`
    SELECT pr.\`PR-ID\`, pr.\`P-ID\`, p.Name AS PatientName,
           pr.\`D-E-ID\`, e.Name AS DoctorName,
           pr.\`Created-At\`, pr.Notes
    FROM Prescription pr
    JOIN Patient p ON pr.\`P-ID\`=p.\`P-ID\`
    JOIN Doctor d ON pr.\`D-E-ID\`=d.\`E-ID\`
    JOIN Employee e ON d.\`E-ID\`=e.\`E-ID\`
    ORDER BY pr.\`PR-ID\` DESC
  `);
  res.json(rows);
});

app.get('/api/prescriptions/:id', async (req, res) => {
  const [rows] = await q(`
    SELECT pr.\`PR-ID\`, pr.\`P-ID\`, p.Name AS PatientName,
           pr.\`D-E-ID\`, e.Name AS DoctorName,
           pr.\`Created-At\`, pr.Notes
    FROM Prescription pr
    JOIN Patient p ON pr.\`P-ID\`=p.\`P-ID\`
    JOIN Doctor d ON pr.\`D-E-ID\`=d.\`E-ID\`
    JOIN Employee e ON d.\`E-ID\`=e.\`E-ID\`
    WHERE pr.\`PR-ID\`=?
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/prescriptions', async (req, res) => {
  try {
    const { 'P-ID': PId, 'D-E-ID': DEId, Notes } = req.body;
    if (!PId || !DEId) return res.status(400).json({ error: 'P-ID and D-E-ID are required' });
    const [r] = await q(
      'INSERT INTO Prescription (`P-ID`,`D-E-ID`,Notes) VALUES (?,?,?)',
      [PId, DEId, Notes || null]
    );
    res.json({ id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/prescriptions/:id', async (req, res) => {
  try {
    const { 'P-ID': PId, 'D-E-ID': DEId, Notes } = req.body;
    await q(
      'UPDATE Prescription SET `P-ID`=?,`D-E-ID`=?,Notes=? WHERE `PR-ID`=?',
      [PId, DEId, Notes || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/prescriptions/:id', async (req, res) => {
  await q('DELETE FROM Prescription WHERE `PR-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* Prescription Items */
app.get('/api/prescriptions/:id/items', async (req, res) => {
  const [rows] = await q(`
    SELECT pi.\`PR-ID\`, pi.\`MED-ID\`, m.Name AS MedicationName,
           m.\`Dosage-Form\`, pi.Dosage, pi.Instructions
    FROM PrescriptionItem pi
    JOIN Medication m ON pi.\`MED-ID\`=m.\`MED-ID\`
    WHERE pi.\`PR-ID\`=?
    ORDER BY m.Name ASC
  `, [req.params.id]);
  res.json(rows);
});

app.post('/api/prescriptions/:id/items', async (req, res) => {
  try {
    const { 'MED-ID': MedId, Dosage, Instructions } = req.body;
    if (!MedId || !Dosage) return res.status(400).json({ error: 'MED-ID and Dosage required' });
    await q(`
      INSERT INTO PrescriptionItem (\`PR-ID\`,\`MED-ID\`,Dosage,Instructions)
      VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE Dosage=VALUES(Dosage), Instructions=VALUES(Instructions)
    `, [req.params.id, MedId, Dosage, Instructions || null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/prescriptions/:id/items/:medId', async (req, res) => {
  await q('DELETE FROM PrescriptionItem WHERE `PR-ID`=? AND `MED-ID`=?', [req.params.id, req.params.medId]);
  res.json({ ok: true });
});

/* ── Global Error Handler ────────────────────────────────────
   Catches any unhandled errors from route handlers (e.g. missing
   tables) and returns a clean JSON 500 instead of crashing Node.
──────────────────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Wrap all async route errors so they reach the handler above
const originalUse = app.use.bind(app);
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Promise Rejection:', reason);
  // Do NOT crash — just log it
});

/* ── Start ────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ MediCore API → http://localhost:${PORT}`));
