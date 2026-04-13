const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

/* ── DB Connection ────────────────────────────────
   Update these credentials before running.
─────────────────────────────────────────────────── */
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'ARUN0123L',
  database: 'hospital_db',
  waitForConnections: true,
  connectionLimit: 10,
});

/* ── Helper ─────────────────────────────────────── */
const q = (sql, params) => pool.execute(sql, params);

/* ════════════════════════════════════════════════
   PATIENTS
════════════════════════════════════════════════ */
app.get('/api/patients', async (req, res) => {
  const [rows] = await q('SELECT * FROM Patient ORDER BY `P-ID` DESC');
  res.json(rows);
});

app.get('/api/patients/:id', async (req, res) => {
  const [rows] = await q('SELECT * FROM Patient WHERE `P-ID` = ?', [
    req.params.id,
  ]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/patients', async (req, res) => {
  const { Name, DOB, Age, Gender, 'Mob-No': MobNo } = req.body;
  const [result] = await q(
    'INSERT INTO Patient (Name, DOB, Age, Gender, `Mob-No`) VALUES (?,?,?,?,?)',
    [Name, DOB, Age, Gender, MobNo],
  );
  res.json({ id: result.insertId });
});

app.put('/api/patients/:id', async (req, res) => {
  const { Name, DOB, Age, Gender, 'Mob-No': MobNo } = req.body;
  await q(
    'UPDATE Patient SET Name=?, DOB=?, Age=?, Gender=?, `Mob-No`=? WHERE `P-ID`=?',
    [Name, DOB, Age, Gender, MobNo, req.params.id],
  );
  res.json({ ok: true });
});

app.delete('/api/patients/:id', async (req, res) => {
  await q('DELETE FROM Patient WHERE `P-ID` = ?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════
   DOCTORS  (Employee ISA)
════════════════════════════════════════════════ */
app.get('/api/doctors', async (req, res) => {
  const [rows] = await q(`
    SELECT e.*, d.Dept, d.Qualification
    FROM Employee e
    JOIN Doctor d ON e.\`E-ID\` = d.\`E-ID\`
    ORDER BY e.\`E-ID\` DESC`);
  res.json(rows);
});

app.get('/api/doctors/:id', async (req, res) => {
  const [rows] = await q(
    `
    SELECT e.*, d.Dept, d.Qualification
    FROM Employee e
    JOIN Doctor d ON e.\`E-ID\` = d.\`E-ID\`
    WHERE e.\`E-ID\` = ?`,
    [req.params.id],
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/doctors', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      Name,
      Salary,
      'Mob-No': MobNo,
      Address,
      City,
      State,
      'Pin-no': Pin,
      Sex,
      Dept,
      Qualification,
    } = req.body;
    const [r] = await conn.execute(
      'INSERT INTO Employee (Name, Salary, `Mob-No`, Address, City, State, `Pin-no`, Sex) VALUES (?,?,?,?,?,?,?,?)',
      [Name, Salary, MobNo, Address, City, State, Pin, Sex],
    );
    const eid = r.insertId;
    await conn.execute(
      'INSERT INTO Doctor (`E-ID`, Dept, Qualification) VALUES (?,?,?)',
      [eid, Dept, Qualification],
    );
    await conn.commit();
    res.json({ id: eid });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.put('/api/doctors/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      Name,
      Salary,
      'Mob-No': MobNo,
      Address,
      City,
      State,
      'Pin-no': Pin,
      Sex,
      Dept,
      Qualification,
    } = req.body;
    await conn.execute(
      'UPDATE Employee SET Name=?, Salary=?, `Mob-No`=?, Address=?, City=?, State=?, `Pin-no`=?, Sex=? WHERE `E-ID`=?',
      [Name, Salary, MobNo, Address, City, State, Pin, Sex, req.params.id],
    );
    await conn.execute(
      'UPDATE Doctor SET Dept=?, Qualification=? WHERE `E-ID`=?',
      [Dept, Qualification, req.params.id],
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/doctors/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM Doctor WHERE `E-ID`=?', [req.params.id]);
    await conn.execute('DELETE FROM Employee WHERE `E-ID`=?', [req.params.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

/* ════════════════════════════════════════════════
   NURSES  (Employee ISA)
════════════════════════════════════════════════ */
app.get('/api/nurses', async (req, res) => {
  const [rows] = await q(`
    SELECT e.\`E-ID\`, e.Name, e.Salary, e.\`Mob-No\`, e.Address, n.Sex
    FROM Employee e
    JOIN Nurse n ON e.\`E-ID\` = n.\`E-ID\`
    ORDER BY e.\`E-ID\` DESC`);
  res.json(rows);
});

app.get('/api/nurses/:id', async (req, res) => {
  const [rows] = await q(
    `
    SELECT e.*, n.Sex FROM Employee e
    JOIN Nurse n ON e.\`E-ID\` = n.\`E-ID\`
    WHERE e.\`E-ID\` = ?`,
    [req.params.id],
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/nurses', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { Name, Salary, 'Mob-No': MobNo, Address, Sex } = req.body;
    const [r] = await conn.execute(
      'INSERT INTO Employee (Name, Salary, `Mob-No`, Address) VALUES (?,?,?,?)',
      [Name, Salary, MobNo, Address],
    );
    const eid = r.insertId;
    await conn.execute('INSERT INTO Nurse (`E-ID`, Sex) VALUES (?,?)', [
      eid,
      Sex,
    ]);
    await conn.commit();
    res.json({ id: eid });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.put('/api/nurses/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { Name, Salary, 'Mob-No': MobNo, Address, Sex } = req.body;
    await conn.execute(
      'UPDATE Employee SET Name=?, Salary=?, `Mob-No`=?, Address=? WHERE `E-ID`=?',
      [Name, Salary, MobNo, Address, req.params.id],
    );
    await conn.execute('UPDATE Nurse SET Sex=? WHERE `E-ID`=?', [
      Sex,
      req.params.id,
    ]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/nurses/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM Nurse WHERE `E-ID`=?', [req.params.id]);
    await conn.execute('DELETE FROM Employee WHERE `E-ID`=?', [req.params.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

/* ════════════════════════════════════════════════
   ROOMS
════════════════════════════════════════════════ */
app.get('/api/rooms', async (req, res) => {
  const [rows] = await q('SELECT * FROM Rooms ORDER BY `R-ID` DESC');
  res.json(rows);
});

app.get('/api/rooms/:id', async (req, res) => {
  const [rows] = await q('SELECT * FROM Rooms WHERE `R-ID` = ?', [
    req.params.id,
  ]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/rooms', async (req, res) => {
  const { Type, Capacity, Availability } = req.body;
  const [result] = await q(
    'INSERT INTO Rooms (Type, Capacity, Availability) VALUES (?,?,?)',
    [Type, Capacity, Availability],
  );
  res.json({ id: result.insertId });
});

app.put('/api/rooms/:id', async (req, res) => {
  const { Type, Capacity, Availability } = req.body;
  await q(
    'UPDATE Rooms SET Type=?, Capacity=?, Availability=? WHERE `R-ID`=?',
    [Type, Capacity, Availability, req.params.id],
  );
  res.json({ ok: true });
});

app.delete('/api/rooms/:id', async (req, res) => {
  await q('DELETE FROM Rooms WHERE `R-ID` = ?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════
   BILLS
════════════════════════════════════════════════ */
app.get('/api/bills', async (req, res) => {
  const [rows] = await q('SELECT * FROM Bills ORDER BY `B-ID` DESC');
  res.json(rows);
});

app.post('/api/bills', async (req, res) => {
  const { 'P-ID': pid, Amount } = req.body;
  const [result] = await q('INSERT INTO Bills (`P-ID`, Amount) VALUES (?,?)', [
    pid,
    Amount,
  ]);
  res.json({ id: result.insertId });
});

app.delete('/api/bills/:id', async (req, res) => {
  await q('DELETE FROM Bills WHERE `B-ID` = ?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════
   TEST REPORTS
════════════════════════════════════════════════ */
app.get('/api/reports', async (req, res) => {
  const [rows] = await q('SELECT * FROM Test_Report ORDER BY id DESC');
  res.json(rows);
});

app.post('/api/reports', async (req, res) => {
  const { 'P-ID': pid, 'R-ID': rid, 'Test-Type': tt, Result } = req.body;
  const [result] = await q(
    'INSERT INTO Test_Report (`P-ID`, `R-ID`, `Test-Type`, Result) VALUES (?,?,?,?)',
    [pid, rid, tt, Result],
  );
  res.json({ id: result.insertId });
});

app.delete('/api/reports/:id', async (req, res) => {
  await q('DELETE FROM Test_Report WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════
   RECORDS
════════════════════════════════════════════════ */
app.get('/api/records', async (req, res) => {
  const [rows] = await q('SELECT * FROM Records ORDER BY `Record-no` DESC');
  res.json(rows);
});

app.post('/api/records', async (req, res) => {
  const { 'App-no': appno } = req.body;
  const [result] = await q('INSERT INTO Records (`App-no`) VALUES (?)', [
    appno,
  ]);
  res.json({ id: result.insertId });
});

app.put('/api/records/:id', async (req, res) => {
  const { 'App-no': appno } = req.body;
  await q('UPDATE Records SET `App-no`=? WHERE `Record-no`=?', [
    appno,
    req.params.id,
  ]);
  res.json({ ok: true });
});

app.delete('/api/records/:id', async (req, res) => {
  await q('DELETE FROM Records WHERE `Record-no` = ?', [req.params.id]);
  res.json({ ok: true });
});

/* ── Start ──────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅  MediCore API running on http://localhost:${PORT}`),
);
