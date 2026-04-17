/* ── Config ─────────────────────────────────────── */
const API = 'http://localhost:3000/api';

/* ── Auth State ─────────────────────────────────── */
let token = localStorage.getItem('token');
let user = null;
try {
  user = JSON.parse(localStorage.getItem('user'));
} catch (e) {}

/* ── Navigation ─────────────────────────────────── */
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const sectionTitle = document.getElementById('section-title');

navItems.forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = item.dataset.section;
    navItems.forEach((n) => n.classList.remove('active'));
    sections.forEach((s) => s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(target).classList.add('active');
    sectionTitle.textContent = item.textContent.trim();
    loadSection(target);
  });
});

function loadSection(name) {
  switch (name) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'appointments':
      loadAppointments();
      break;
    case 'patients':
      loadPatients();
      break;
    case 'doctors':
      loadDoctors();
      break;
    case 'rooms':
      loadRooms();
      break;
    case 'medications':
      loadMedications();
      break;
    case 'prescriptions':
      loadPrescriptions();
      break;
  }
}

/* ── Toast ──────────────────────────────────────── */
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, isError = false) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className = 'toast show' + (isError ? ' error' : '');
  toastTimer = setTimeout(() => (toastEl.className = 'toast'), 2800);
}

/* ── Modal ──────────────────────────────────────── */
let activeModal = null;
function openModal(id) {
  document.getElementById('modal-overlay').classList.add('active');
  const m = document.getElementById(id);
  m.classList.add('active');
  activeModal = id;
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document
    .querySelectorAll('.modal')
    .forEach((m) => m.classList.remove('active'));
  clearModalForms();
  activeModal = null;
}
function clearModalForms() {
  document.querySelectorAll('.modal input, .modal select').forEach((el) => {
    if (el.type !== 'hidden') el.value = '';
    else el.value = '';
  });
}

/* ── Fetch Helper ───────────────────────────────── */
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) {
    opts.headers['Authorization'] = `Bearer ${token}`;
  }
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  if (res.status === 401 && path !== '/auth/login') {
    logout();
    throw new Error('Session expired. Please log in.');
  }
  if (!res.ok) {
    let errText = await res.text();
    try {
      const j = JSON.parse(errText);
      if (j.error) errText = j.error;
    } catch (e) {}
    throw new Error(errText);
  }
  return res.json();
}

/* ── Auth Flow ──────────────────────────────────── */
function checkAuth() {
  // No login - direct dashboard access
  loadDashboard();
}

/* ── Dashboard ──────────────────────────────────── */
async function loadDashboard() {
  try {
    const [patients, doctors, rooms] = await Promise.all([
      api('/patients').catch(() => []),
      api('/doctors').catch(() => []),
      api('/rooms').catch(() => []),
    ]);

    document.getElementById('count-patients').textContent = patients.length;
    document.getElementById('count-doctors').textContent = doctors.length;
    document.getElementById('count-rooms').textContent = rooms.length;

    const pTbody = document.querySelector('#recent-patients-table tbody');
    pTbody.innerHTML = patients
      .slice(0, 6)
      .map(
        (p) => `
      <tr>
        <td>${p['P-ID']}</td>
        <td>${p.Name}</td>
        <td>${p.Age}</td>
        <td>${p.Gender}</td>
      </tr>`,
      )
      .join('');

    const rTbody = document.querySelector('#room-avail-table tbody');
    rTbody.innerHTML = rooms
      .slice(0, 6)
      .map(
        (r) => `
      <tr>
        <td>${r['R-ID']}</td>
        <td>${r.Type}</td>
        <td>${r.Capacity}</td>
        <td>${
          r.Availability
            ? '<span class="badge badge-green">Yes</span>'
            : '<span class="badge badge-red">No</span>'
        }</td>
      </tr>`,
      )
      .join('');
  } catch (err) {
    showToast('Could not load dashboard', true);
  }
}

/* ── APPOINTMENTS ───────────────────────────────── */
async function loadAppointments() {
  try {
    const rows = await api('/appointments');
    const tbody = document.querySelector('#appointments-table tbody');
    tbody.innerHTML = rows
      .map(
        (a) => `
      <tr>
        <td>${a['A-ID']}</td>
        <td>#${a['P-ID']} ${a.PatientName}</td>
        <td>Dr. ${a.DoctorName}</td>
        <td>${a['R-ID'] || '-'}</td>
        <td>${a['Scheduled-At'] ? new Date(a['Scheduled-At']).toLocaleString() : '-'}</td>
        <td>${a.Status}</td>
        <td>${a.Notes || ''}</td>
        <td>
          <button class="btn-icon btn-edit" onclick="editAppointment(${a['A-ID']})">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteAppointment(${a['A-ID']})">✕</button>
        </td>
      </tr>`,
      )
      .join('');
  } catch (err) {
    showToast('Error loading appointments', true);
  }
}

async function saveAppointment() {
  const id = document.getElementById('a-id-hidden').value;
  let scheduledAt = document.getElementById('a-scheduled').value;
  if (scheduledAt) {
    scheduledAt = new Date(scheduledAt)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
  }
  const payload = {
    'P-ID': document.getElementById('a-pid').value,
    'D-E-ID': document.getElementById('a-did').value,
    'R-ID': document.getElementById('a-rid').value || null,
    'Scheduled-At': scheduledAt,
    Status: document.getElementById('a-status').value,
    Notes: document.getElementById('a-notes').value,
  };
  try {
    if (id) await api(`/appointments/${id}`, 'PUT', payload);
    else await api('/appointments', 'POST', payload);
    showToast('Appointment saved!');
    closeModal();
    loadAppointments();
  } catch (err) {
    showToast('Error: ' + err.message, true);
  }
}

async function editAppointment(id) {
  try {
    const a = await api(`/appointments/${id}`);
    document.getElementById('a-id-hidden').value = a['A-ID'];
    document.getElementById('a-pid').value = a['P-ID'];
    document.getElementById('a-did').value = a['D-E-ID'];
    document.getElementById('a-rid').value = a['R-ID'] || '';
    if (a['Scheduled-At']) {
      document.getElementById('a-scheduled').value = new Date(
        new Date(a['Scheduled-At']).getTime() -
          new Date().getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);
    }
    document.getElementById('a-status').value = a.Status;
    document.getElementById('a-notes').value = a.Notes || '';
    openModal('appointment-modal');
  } catch (err) {
    showToast('Could not load appointment', true);
  }
}

async function deleteAppointment(id) {
  if (!confirm('Delete appointment #' + id + '?')) return;
  try {
    await api(`/appointments/${id}`, 'DELETE');
    showToast('Appointment deleted');
    loadAppointments();
  } catch (err) {
    showToast('Error deleting', true);
  }
}

/* ── PATIENTS ───────────────────────────────────── */
async function loadPatients() {
  try {
    const rows = await api('/patients');
    const tbody = document.querySelector('#patients-table tbody');
    tbody.innerHTML = rows
      .map(
        (p) => `
      <tr>
        <td>${p['P-ID']}</td>
        <td>${p.Name}</td>
        <td>${p.DOB ? p.DOB.split('T')[0] : ''}</td>
        <td>${p.Age}</td>
        <td>${p.Gender}</td>
        <td>${p['Mob-No']}</td>
        <td>
          <button class="btn-icon btn-edit" onclick="editPatient(${p['P-ID']})">✎</button>
          <button class="btn-icon btn-del"  onclick="deletePatient(${p['P-ID']})">✕</button>
        </td>
      </tr>`,
      )
      .join('');
  } catch (err) {
    showToast('Error loading patients', true);
  }
}

async function savePatient() {
  const id = document.getElementById('p-id-hidden').value;
  const payload = {
    Name: document.getElementById('p-name').value,
    DOB: document.getElementById('p-dob').value,
    Age: document.getElementById('p-age').value,
    Gender: document.getElementById('p-gender').value,
    'Mob-No': document.getElementById('p-mob').value,
  };
  try {
    if (id) await api(`/patients/${id}`, 'PUT', payload);
    else await api('/patients', 'POST', payload);
    showToast('Patient saved!');
    closeModal();
    loadPatients();
    loadDashboard();
  } catch (err) {
    showToast('Error: ' + err.message, true);
  }
}

async function editPatient(id) {
  try {
    const p = await api(`/patients/${id}`);
    document.getElementById('p-id-hidden').value = p['P-ID'];
    document.getElementById('p-name').value = p.Name;
    document.getElementById('p-dob').value = p.DOB ? p.DOB.split('T')[0] : '';
    document.getElementById('p-age').value = p.Age;
    document.getElementById('p-gender').value = p.Gender;
    document.getElementById('p-mob').value = p['Mob-No'];
    openModal('patient-modal');
  } catch (err) {
    showToast('Could not load patient', true);
  }
}

async function deletePatient(id) {
  if (!confirm('Delete patient #' + id + '?')) return;
  try {
    await api(`/patients/${id}`, 'DELETE');
    showToast('Patient deleted');
    loadPatients();
    loadDashboard();
  } catch (err) {
    showToast('Error deleting', true);
  }
}

/* ── DOCTORS ────────────────────────────────────── */
async function loadDoctors() {
  try {
    const rows = await api('/doctors');
    const tbody = document.querySelector('#doctors-table tbody');
    tbody.innerHTML = rows
      .map(
        (d) => `
      <tr>
        <td>${d['E-ID']}</td>
        <td>${d.Name}</td>
        <td>${d.Dept}</td>
        <td>${d.Qualification}</td>
        <td>₹${Number(d.Salary).toLocaleString('en-IN')}</td>
        <td>
          <button class="btn-icon btn-edit" onclick="editDoctor(${d['E-ID']})">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteDoctor(${d['E-ID']})">✕</button>
        </td>
      </tr>`,
      )
      .join('');
  } catch (err) {
    showToast('Error loading doctors', true);
  }
}

async function saveDoctor() {
  const id = document.getElementById('d-id-hidden').value;
  const payload = {
    Name: document.getElementById('d-name').value,
    Dept: document.getElementById('d-dept').value,
    Qualification: document.getElementById('d-qual').value,
    Salary: document.getElementById('d-salary').value,
    'Mob-No': document.getElementById('d-mob').value,
    Address: document.getElementById('d-address').value,
    City: document.getElementById('d-city').value,
    State: document.getElementById('d-state').value,
    'Pin-no': document.getElementById('d-pin').value,
    Sex: document.getElementById('d-sex').value,
  };
  try {
    if (id) await api(`/doctors/${id}`, 'PUT', payload);
    else await api('/doctors', 'POST', payload);
    showToast('Doctor saved!');
    closeModal();
    loadDoctors();
  } catch (err) {
    showToast('Error: ' + err.message, true);
  }
}

async function editDoctor(id) {
  try {
    const d = await api(`/doctors/${id}`);
    document.getElementById('d-id-hidden').value = d['E-ID'];
    document.getElementById('d-name').value = d.Name;
    document.getElementById('d-dept').value = d.Dept;
    document.getElementById('d-qual').value = d.Qualification;
    document.getElementById('d-salary').value = d.Salary;
    document.getElementById('d-mob').value = d['Mob-No'];
    document.getElementById('d-address').value = d.Address;
    document.getElementById('d-city').value = d.City;
    document.getElementById('d-state').value = d.State;
    document.getElementById('d-pin').value = d['Pin-no'];
    document.getElementById('d-sex').value = d.Sex;
    openModal('doctor-modal');
  } catch (err) {
    showToast('Could not load doctor', true);
  }
}

async function deleteDoctor(id) {
  if (!confirm('Delete doctor #' + id + '?')) return;
  try {
    await api(`/doctors/${id}`, 'DELETE');
    showToast('Doctor deleted');
    loadDoctors();
  } catch (err) {
    showToast('Error deleting', true);
  }
}

/* ── ROOMS ──────────────────────────────────────── */
async function loadRooms() {
  try {
    const rows = await api('/rooms');
    const tbody = document.querySelector('#rooms-table tbody');
    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${r['R-ID']}</td>
        <td>${r.Type}</td>
        <td>${r.Capacity}</td>
        <td>${
          r.Availability
            ? '<span class="badge badge-green">Available</span>'
            : '<span class="badge badge-red">Occupied</span>'
        }</td>
        <td>
          <button class="btn-icon btn-edit" onclick="editRoom(${r['R-ID']})">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteRoom(${r['R-ID']})">✕</button>
        </td>
      </tr>`,
      )
      .join('');
  } catch (err) {
    showToast('Error loading rooms', true);
  }
}

async function saveRoom() {
  const id = document.getElementById('r-id-hidden').value;
  const payload = {
    Type: document.getElementById('r-type').value,
    Capacity: document.getElementById('r-capacity').value,
    Availability: document.getElementById('r-avail').value,
  };
  try {
    if (id) await api(`/rooms/${id}`, 'PUT', payload);
    else await api('/rooms', 'POST', payload);
    showToast('Room saved!');
    closeModal();
    loadRooms();
  } catch (err) {
    showToast('Error: ' + err.message, true);
  }
}

async function editRoom(id) {
  try {
    const r = await api(`/rooms/${id}`);
    document.getElementById('r-id-hidden').value = r['R-ID'];
    document.getElementById('r-type').value = r.Type;
    document.getElementById('r-capacity').value = r.Capacity;
    document.getElementById('r-avail').value = r.Availability;
    openModal('room-modal');
  } catch (err) {
    showToast('Could not load room', true);
  }
}

async function deleteRoom(id) {
  if (!confirm('Delete room #' + id + '?')) return;
  try {
    await api(`/rooms/${id}`, 'DELETE');
    showToast('Room deleted');
    loadRooms();
  } catch (err) {
    showToast('Error deleting', true);
  }
}

/* ── MEDICATIONS ────────────────────────────────── */
async function loadMedications() {
  try {
    const rows = await api('/medications');
    const tbody = document.querySelector('#medications-table tbody');
    tbody.innerHTML = rows
      .map(
        (m) => `
      <tr>
        <td>${m['MED-ID']}</td>
        <td>${m.Name}</td>
        <td>${m['Dosage-Form']}</td>
        <td>${m.Manufacturer || '-'}</td>
        <td>
          <button class="btn-icon btn-edit" onclick="editMedication(${m['MED-ID']})">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteMedication(${m['MED-ID']})">✕</button>
        </td>
      </tr>`,
      )
      .join('');
  } catch (err) {
    showToast('Error loading medications', true);
  }
}

async function saveMedication() {
  const id = document.getElementById('m-id-hidden').value;
  const payload = {
    Name: document.getElementById('m-name').value,
    'Dosage-Form': document.getElementById('m-form').value,
    Manufacturer: document.getElementById('m-manu').value,
  };
  try {
    if (id) await api(`/medications/${id}`, 'PUT', payload);
    else await api('/medications', 'POST', payload);
    showToast('Medication saved!');
    closeModal();
    loadMedications();
  } catch (err) {
    showToast('Error: ' + err.message, true);
  }
}

async function editMedication(id) {
  try {
    const m = await api(`/medications/${id}`);
    document.getElementById('m-id-hidden').value = m['MED-ID'];
    document.getElementById('m-name').value = m.Name;
    document.getElementById('m-form').value = m['Dosage-Form'] || '';
    document.getElementById('m-manu').value = m.Manufacturer || '';
    openModal('medication-modal');
  } catch (err) {
    showToast('Could not load medication', true);
  }
}

async function deleteMedication(id) {
  if (!confirm('Delete medication #' + id + '?')) return;
  try {
    await api(`/medications/${id}`, 'DELETE');
    showToast('Medication deleted');
    loadMedications();
  } catch (err) {
    showToast('Error deleting', true);
  }
}

/* ── PRESCRIPTIONS ──────────────────────────────── */
async function loadPrescriptions() {
  try {
    const rows = await api('/prescriptions');
    const tbody = document.querySelector('#prescriptions-table tbody');
    tbody.innerHTML = rows
      .map(
        (pr) => `
      <tr>
        <td>${pr['PR-ID']}</td>
        <td>#${pr['P-ID']} ${pr.PatientName}</td>
        <td>Dr. ${pr.DoctorName}</td>
        <td>${pr['Created-At'] ? new Date(pr['Created-At']).toLocaleString() : '-'}</td>
        <td>${pr.Notes || ''}</td>
        <td>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="managePrescriptionItems(${pr['PR-ID']})">Manage Items</button>
        </td>
        <td>
          <button class="btn-icon btn-edit" onclick="editPrescription(${pr['PR-ID']})">✎</button>
          <button class="btn-icon btn-del"  onclick="deletePrescription(${pr['PR-ID']})">✕</button>
        </td>
      </tr>`,
      )
      .join('');
  } catch (err) {
    showToast('Error loading prescriptions', true);
  }
}

async function savePrescription() {
  const id = document.getElementById('pr-id-hidden').value;
  const payload = {
    'P-ID': document.getElementById('pr-pid').value,
    'D-E-ID': document.getElementById('pr-did').value,
    Notes: document.getElementById('pr-notes').value,
  };
  try {
    if (id) await api(`/prescriptions/${id}`, 'PUT', payload);
    else await api('/prescriptions', 'POST', payload);
    showToast('Prescription saved!');
    closeModal();
    loadPrescriptions();
  } catch (err) {
    showToast('Error: ' + err.message, true);
  }
}

async function editPrescription(id) {
  try {
    const pr = await api(`/prescriptions/${id}`);
    document.getElementById('pr-id-hidden').value = pr['PR-ID'];
    document.getElementById('pr-pid').value = pr['P-ID'];
    document.getElementById('pr-did').value = pr['D-E-ID'];
    document.getElementById('pr-notes').value = pr.Notes || '';
    openModal('prescription-modal');
  } catch (err) {
    showToast('Could not load prescription', true);
  }
}

async function deletePrescription(id) {
  if (!confirm('Delete prescription #' + id + '?')) return;
  try {
    await api(`/prescriptions/${id}`, 'DELETE');
    showToast('Prescription deleted');
    loadPrescriptions();
  } catch (err) {
    showToast('Error deleting', true);
  }
}

/* ── PRESCRIPTION ITEMS ─────────────────────────── */
async function managePrescriptionItems(prId) {
  document.getElementById('pri-prid-hidden').value = prId;
  document.getElementById('pri-title').textContent =
    'Prescription Items (PR-' + prId + ')';
  document.getElementById('pri-medid').value = '';
  document.getElementById('pri-dosage').value = '';
  document.getElementById('pri-instructions').value = '';
  openModal('prescription-items-modal');
  await reloadPrescriptionItems(prId);
}

async function reloadPrescriptionItems(prId) {
  try {
    const items = await api(`/prescriptions/${prId}/items`);
    const tbody = document.querySelector('#prescription-items-table tbody');
    tbody.innerHTML = items
      .map(
        (i) => `
      <tr>
        <td>#${i['MED-ID']} ${i.MedicationName}</td>
        <td>${i.Dosage}</td>
        <td>${i.Instructions || '-'}</td>
        <td>
          <button class="btn-icon btn-del" onclick="deletePrescriptionItem(${prId}, ${i['MED-ID']})">✕</button>
        </td>
      </tr>`,
      )
      .join('');
  } catch (err) {
    showToast('Error loading items', true);
  }
}

async function savePrescriptionItem() {
  const prId = document.getElementById('pri-prid-hidden').value;
  const payload = {
    'MED-ID': document.getElementById('pri-medid').value,
    Dosage: document.getElementById('pri-dosage').value,
    Instructions: document.getElementById('pri-instructions').value,
  };
  try {
    await api(`/prescriptions/${prId}/items`, 'POST', payload);
    showToast('Item added/updated');
    document.getElementById('pri-medid').value = '';
    document.getElementById('pri-dosage').value = '';
    document.getElementById('pri-instructions').value = '';
    reloadPrescriptionItems(prId);
  } catch (err) {
    showToast('Error: ' + err.message, true);
  }
}

async function deletePrescriptionItem(prId, medId) {
  if (!confirm('Remove this item?')) return;
  try {
    await api(`/prescriptions/${prId}/items/${medId}`, 'DELETE');
    showToast('Item deleted');
    reloadPrescriptionItems(prId);
  } catch (err) {
    showToast('Error deleting item', true);
  }
}

/* ── Global Search ──────────────────────────────── */
document.getElementById('globalSearch').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  document
    .querySelectorAll('.section.active .data-table tbody tr')
    .forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q)
        ? ''
        : 'none';
    });
});

/* ── Init ───────────────────────────────────────── */
// Wait for DOM to be fully loaded before running checkAuth
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAuth);
} else {
  checkAuth();
}
