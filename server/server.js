const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(
  cors({ origin: '*', allowedHeaders: ['Content-Type', 'Authorization'] }),
);
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

/* ── Appointments ───────────────────────────────── */
app.get('/api/appointments', async (req, res) => {
  const [rows] = await q(`
    SELECT a.\`A-ID\`,
           a.\`P-ID\`, p.Name AS PatientName,
           a.\`D-E-ID\`, e.Name AS DoctorName,
           a.\`R-ID\`, r.Type AS RoomType,
           a.\`Scheduled-At\`,
           a.Status,
           a.Notes
    FROM Appointment a
    JOIN Patient p ON a.\`P-ID\` = p.\`P-ID\`
    JOIN Doctor d ON a.\`D-E-ID\` = d.\`E-ID\`
    JOIN Employee e ON d.\`E-ID\` = e.\`E-ID\`
    LEFT JOIN Rooms r ON a.\`R-ID\` = r.\`R-ID\`
    ORDER BY a.\`A-ID\` DESC
  `);
  res.json(rows);
});

app.get('/api/appointments/:id', async (req, res) => {
  const [rows] = await q(
    `
    SELECT a.\`A-ID\`,
           a.\`P-ID\`, p.Name AS PatientName,
           a.\`D-E-ID\`, e.Name AS DoctorName,
           a.\`R-ID\`, r.Type AS RoomType,
           a.\`Scheduled-At\`,
           a.Status,
           a.Notes
    FROM Appointment a
    JOIN Patient p ON a.\`P-ID\` = p.\`P-ID\`
    JOIN Doctor d ON a.\`D-E-ID\` = d.\`E-ID\`
    JOIN Employee e ON d.\`E-ID\` = e.\`E-ID\`
    LEFT JOIN Rooms r ON a.\`R-ID\` = r.\`R-ID\`
    WHERE a.\`A-ID\` = ?
    `,
    [req.params.id],
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/appointments', async (req, res) => {
  try {
    const pId = req.body['P-ID'] ?? req.body.pId;
    const dEId = req.body['D-E-ID'] ?? req.body.dEId ?? req.body.doctorEId;
    const rId = req.body['R-ID'] ?? req.body.rId ?? null;
    const scheduledAt =
      req.body['Scheduled-At'] ?? req.body.scheduledAt ?? null;
    const status = req.body.Status ?? req.body.status ?? 'Scheduled';
    const notes = req.body.Notes ?? req.body.notes ?? null;

    if (pId === undefined || dEId === undefined) {
      return res.status(400).json({ error: 'P-ID and D-E-ID are required' });
    }

    const [result] = await q(
      'INSERT INTO Appointment (`P-ID`, `D-E-ID`, `R-ID`, `Scheduled-At`, Status, Notes) VALUES (?,?,?,?,?,?)',
      [pId, dEId, rId, scheduledAt, status, notes],
    );

    res.json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const pId = req.body['P-ID'] ?? req.body.pId;
    const dEId = req.body['D-E-ID'] ?? req.body.dEId ?? req.body.doctorEId;
    const rId = req.body['R-ID'] ?? req.body.rId ?? null;
    const scheduledAt =
      req.body['Scheduled-At'] ?? req.body.scheduledAt ?? null;
    const status = req.body.Status ?? req.body.status ?? 'Scheduled';
    const notes = req.body.Notes ?? req.body.notes ?? null;

    await q(
      'UPDATE Appointment SET `P-ID`=?, `D-E-ID`=?, `R-ID`=?, `Scheduled-At`=?, Status=?, Notes=? WHERE `A-ID`=?',
      [pId, dEId, rId, scheduledAt, status, notes, req.params.id],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  await q('DELETE FROM Appointment WHERE `A-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ── Medication ──────────────────────────────────── */
app.get('/api/medications', async (req, res) => {
  const [rows] = await q('SELECT * FROM Medication ORDER BY `MED-ID` DESC');
  res.json(rows);
});

app.get('/api/medications/:id', async (req, res) => {
  const [rows] = await q('SELECT * FROM Medication WHERE `MED-ID` = ?', [
    req.params.id,
  ]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/medications', async (req, res) => {
  try {
    const Name = req.body.Name ?? req.body.name;
    const dosageForm = req.body['Dosage-Form'] ?? req.body.dosageForm ?? null;
    const Manufacturer = req.body.Manufacturer ?? req.body.manufacturer ?? null;

    if (!Name) return res.status(400).json({ error: 'Name is required' });

    const [result] = await q(
      'INSERT INTO Medication (Name, `Dosage-Form`, Manufacturer) VALUES (?,?,?)',
      [Name, dosageForm, Manufacturer],
    );
    res.json({ id: result.insertId });
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Medication name already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/medications/:id', async (req, res) => {
  try {
    const Name = req.body.Name ?? req.body.name;
    const dosageForm = req.body['Dosage-Form'] ?? req.body.dosageForm ?? null;
    const Manufacturer = req.body.Manufacturer ?? req.body.manufacturer ?? null;

    await q(
      'UPDATE Medication SET Name=?, `Dosage-Form`=?, Manufacturer=? WHERE `MED-ID`=?',
      [Name, dosageForm, Manufacturer, req.params.id],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/medications/:id', async (req, res) => {
  await q('DELETE FROM Medication WHERE `MED-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ── Prescriptions ───────────────────────────────── */
app.get('/api/prescriptions', async (req, res) => {
  const [rows] = await q(`
    SELECT pr.\`PR-ID\`,
           pr.\`P-ID\`, p.Name AS PatientName,
           pr.\`D-E-ID\`, e.Name AS DoctorName,
           pr.\`Created-At\`,
           pr.Notes
    FROM Prescription pr
    JOIN Patient p ON pr.\`P-ID\` = p.\`P-ID\`
    JOIN Doctor d ON pr.\`D-E-ID\` = d.\`E-ID\`
    JOIN Employee e ON d.\`E-ID\` = e.\`E-ID\`
    ORDER BY pr.\`PR-ID\` DESC
  `);
  res.json(rows);
});

app.get('/api/prescriptions/:id', async (req, res) => {
  const [rows] = await q(
    `
    SELECT pr.\`PR-ID\`,
           pr.\`P-ID\`, p.Name AS PatientName,
           pr.\`D-E-ID\`, e.Name AS DoctorName,
           pr.\`Created-At\`,
           pr.Notes
    FROM Prescription pr
    JOIN Patient p ON pr.\`P-ID\` = p.\`P-ID\`
    JOIN Doctor d ON pr.\`D-E-ID\` = d.\`E-ID\`
    JOIN Employee e ON d.\`E-ID\` = e.\`E-ID\`
    WHERE pr.\`PR-ID\` = ?
    `,
    [req.params.id],
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/api/prescriptions', async (req, res) => {
  try {
    const pId = req.body['P-ID'] ?? req.body.pId;
    const dEId = req.body['D-E-ID'] ?? req.body.dEId ?? req.body.doctorEId;
    const notes = req.body.Notes ?? req.body.notes ?? null;

    if (pId === undefined || dEId === undefined) {
      return res.status(400).json({ error: 'P-ID and D-E-ID are required' });
    }

    const [result] = await q(
      'INSERT INTO Prescription (`P-ID`, `D-E-ID`, Notes) VALUES (?,?,?)',
      [pId, dEId, notes],
    );
    res.json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/prescriptions/:id', async (req, res) => {
  try {
    const pId = req.body['P-ID'] ?? req.body.pId;
    const dEId = req.body['D-E-ID'] ?? req.body.dEId ?? req.body.doctorEId;
    const notes = req.body.Notes ?? req.body.notes ?? null;

    await q(
      'UPDATE Prescription SET `P-ID`=?, `D-E-ID`=?, Notes=? WHERE `PR-ID`=?',
      [pId, dEId, notes, req.params.id],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/prescriptions/:id', async (req, res) => {
  await q('DELETE FROM Prescription WHERE `PR-ID`=?', [req.params.id]);
  res.json({ ok: true });
});

/* ── Prescription Items ───────────────────────────── */
app.get('/api/prescriptions/:id/items', async (req, res) => {
  const [rows] = await q(
    `
    SELECT pi.\`PR-ID\`,
           pi.\`MED-ID\`, m.Name AS MedicationName,
           m.\`Dosage-Form\`,
           pi.Dosage,
           pi.Instructions
    FROM PrescriptionItem pi
    JOIN Medication m ON pi.\`MED-ID\` = m.\`MED-ID\`
    WHERE pi.\`PR-ID\` = ?
    ORDER BY m.Name ASC
    `,
    [req.params.id],
  );
  res.json(rows);
});

app.post('/api/prescriptions/:id/items', async (req, res) => {
  try {
    const medId = req.body['MED-ID'] ?? req.body.medId;
    const dosage = req.body.Dosage ?? req.body.dosage;
    const instructions = req.body.Instructions ?? req.body.instructions ?? null;

    if (medId === undefined || dosage === undefined) {
      return res.status(400).json({ error: 'MED-ID and Dosage are required' });
    }

    await q(
      `
      INSERT INTO PrescriptionItem (\`PR-ID\`, \`MED-ID\`, Dosage, Instructions)
      VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE
        Dosage = VALUES(Dosage),
        Instructions = VALUES(Instructions)
      `,
      [req.params.id, medId, dosage, instructions],
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/prescriptions/:id/items/:medId', async (req, res) => {
  await q('DELETE FROM PrescriptionItem WHERE `PR-ID`=? AND `MED-ID`=?', [
    req.params.id,
    req.params.medId,
  ]);
  res.json({ ok: true });
});

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
      'INSERT INTO Employee (Name, Salary, `Mob-No`, Address, City, State, `Pin-no`) VALUES (?,?,?,?,?,?,?)',
      [Name, Salary, MobNo, Address, City, State, Pin],
    );
    const eid = r.insertId;
    await conn.execute(
      'INSERT INTO Doctor (`E-ID`, Dept, Qualification, Sex) VALUES (?,?,?,?)',
      [eid, Dept, Qualification, Sex],
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
      'UPDATE Employee SET Name=?, Salary=?, `Mob-No`=?, Address=?, City=?, State=?, `Pin-no`=? WHERE `E-ID`=?',
      [Name, Salary, MobNo, Address, City, State, Pin, req.params.id],
    );
    await conn.execute(
      'UPDATE Doctor SET Dept=?, Qualification=?, Sex=? WHERE `E-ID`=?',
      [Dept, Qualification, Sex, req.params.id],
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

/* ── Start ──────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅  MediCore API running on http://localhost:${PORT}`),
);
