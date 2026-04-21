/* ═══════════════════════════════════════════════════════════════
   MediCore HMS — Complete Frontend Logic
   11 Entities: Departments, Suppliers, Patients, Doctors, Nurses,
                Rooms, Medications, Bills, Appointments, Prescriptions
═══════════════════════════════════════════════════════════════ */

const API = 'http://localhost:3000/api';

/* ── Auth State ─────────────────────────────────────────────── */
let token = localStorage.getItem('token');
let user = null;
try { user = JSON.parse(localStorage.getItem('user')); } catch (e) {}

/* ── Cache ──────────────────────────────────────────────────── */
let _patients = [], _doctors = [], _rooms = [], _medications = [],
    _suppliers = [], _departments = [], _appointments = [];

/* ══════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  if (token && user) showApp();
  else showLogin();
  initSidebar();
  initNavigation();
  initGlobalSearch();
});

function showApp() {
  document.getElementById('login-overlay').classList.remove('active');
  document.getElementById('app-layout').style.display = 'flex';
  updateUserInfo();
  loadDashboard();
}

function showLogin() {
  document.getElementById('login-overlay').classList.add('active');
  document.getElementById('app-layout').style.display = 'none';
}

/* ══════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-submit-btn');
  errEl.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<span>Signing in…</span>';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    token = data.token;
    user  = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    showApp();
    showToast('Welcome back, ' + user.username + '! 👋');
  } catch (err) {
    errEl.textContent = err.message || 'Invalid credentials';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In to Dashboard</span><span>→</span>';
  }
}

function logout() {
  token = null; user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showLogin();
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
  showToast('Logged out successfully');
}

function updateUserInfo() {
  if (!user) return;
  const name = user.username || 'Admin';
  const initial = name.charAt(0).toUpperCase();
  document.getElementById('username-display').textContent = name;
  document.getElementById('user-avatar').textContent = initial;
  document.getElementById('sidebar-avatar').textContent = initial;
  document.getElementById('sidebar-username').textContent = name;
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR TOGGLE
══════════════════════════════════════════════════════════════ */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('main');
  const btn     = document.getElementById('sidebar-toggle');
  let collapsed = false;

  btn.addEventListener('click', () => {
    collapsed = !collapsed;
    sidebar.classList.toggle('collapsed', collapsed);
    main.classList.toggle('expanded', collapsed);
  });
}

/* ══════════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════════ */
const sectionMap = {
  dashboard:     'Dashboard',
  appointments:  'Appointments',
  patients:      'Patients',
  doctors:       'Doctors',
  nurses:        'Nurses',
  departments:   'Departments',
  rooms:         'Rooms',
  medications:   'Medications',
  bills:         'Bills & Invoices',
  prescriptions: 'Prescriptions',
  suppliers:     'Suppliers',
};

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const target = item.dataset.section;
      navigateTo(target);
    });
  });
}

function navigateTo(target) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const navEl = document.getElementById('nav-' + target);
  if (navEl) navEl.classList.add('active');
  const sec = document.getElementById(target);
  if (sec) sec.classList.add('active');
  document.getElementById('section-title').textContent = sectionMap[target] || target;
  loadSection(target);
}

function loadSection(name) {
  switch (name) {
    case 'dashboard':     loadDashboard();     break;
    case 'appointments':  loadAppointments();  break;
    case 'patients':      loadPatients();      break;
    case 'doctors':       loadDoctors();       break;
    case 'nurses':        loadNurses();        break;
    case 'departments':   loadDepartments();   break;
    case 'rooms':         loadRooms();         break;
    case 'medications':   loadMedications();   break;
    case 'bills':         loadBills();         break;
    case 'prescriptions': loadPrescriptions(); break;
    case 'suppliers':     loadSuppliers();     break;
  }
}

/* ══════════════════════════════════════════════════════════════
   API HELPER
══════════════════════════════════════════════════════════════ */
async function apiCall(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  // 401 = no token, 403 = token invalid/expired — both force re-login
  if ((res.status === 401 || res.status === 403) && path !== '/auth/login') {
    logout();
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    let msg = await res.text();
    try { const j = JSON.parse(msg); if (j.error) msg = j.error; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

/* ══════════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════════ */
let _toastTimer;
function showToast(msg, isError = false) {
  clearTimeout(_toastTimer);
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  _toastTimer = setTimeout(() => t.className = 'toast', 3000);
}

/* ══════════════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════════════ */
let _activeModal = null;

function openModal(id) {
  document.getElementById('modal-overlay').classList.add('active');
  const m = document.getElementById(id);
  m.classList.add('active');
  _activeModal = id;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.modal input, .modal select, .modal textarea').forEach(el => {
    if (el.type === 'hidden' || !el.hasAttribute('type')) el.value = '';
    else el.value = '';
  });
  _activeModal = null;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ══════════════════════════════════════════════════════════════
   FILTER / SEARCH
══════════════════════════════════════════════════════════════ */
function filterTable(tableId, query) {
  const q = query.toLowerCase();
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function initGlobalSearch() {
  document.getElementById('global-search').addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.section.active .data-table tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   ANALYTICS HELPERS
══════════════════════════════════════════════════════════════ */
function renderProgressBars(containerId, items, colorVar = 'var(--accent)') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const max = Math.max(...items.map(i => i.value), 1);
  el.innerHTML = items.map(item => `
    <div class="progress-item">
      <div class="progress-label">
        <span>${item.label}</span>
        <span>${item.display !== undefined ? item.display : item.value}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${(item.value/max*100).toFixed(1)}%;background:${item.color || colorVar}"></div>
      </div>
    </div>
  `).join('');
}

function renderStatCards(containerId, stats) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = stats.map(s => `
    <div class="stat-card" style="--card-color:${s.color || 'var(--accent)'}">
      <div class="stat-icon-wrap">${s.icon}</div>
      <div class="stat-body">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const d = await apiCall('/dashboard');
    const c = d.counts;

    // KPIs
    document.getElementById('kpi-patients').textContent     = c.patients;
    document.getElementById('kpi-doctors').textContent      = c.doctors;
    document.getElementById('kpi-rooms').textContent        = c.availableRooms;
    document.getElementById('kpi-pending').textContent      = c.pendingBills;
    document.getElementById('kpi-nurses').textContent       = c.nurses;
    document.getElementById('kpi-appointments').textContent = c.scheduledAppointments;
    document.getElementById('kpi-meds').textContent         = c.medications || '–';
    document.getElementById('kpi-revenue').textContent      = '₹'+Number(c.totalRevenuePaid||0).toLocaleString('en-IN');

    // Appointment Status Chart
    const aptColors = { Scheduled: 'var(--accent)', Completed: 'var(--emerald)', Cancelled: 'var(--rose)' };
    renderProgressBars('apt-status-chart', d.aptByStatus.map(r => ({
      label: r.Status, value: r.cnt, color: aptColors[r.Status] || 'var(--cyan)'
    })));

    // Room Type Chart
    renderProgressBars('room-type-chart', d.roomsByType.map(r => ({
      label: r.Type, value: r.cnt,
      display: `${r.avail}/${r.cnt} avail`, color: 'var(--cyan)'
    })));

    // Bill Status Chart
    const billColors = { Pending: 'var(--amber)', Paid: 'var(--emerald)', Cancelled: 'var(--rose)' };
    renderProgressBars('bill-status-chart', d.billsByStatus.map(r => ({
      label: r.Status, value: r.cnt,
      display: `${r.cnt} (₹${Number(r.total||0).toLocaleString('en-IN')})`,
      color: billColors[r.Status] || 'var(--accent)'
    })));

    // Dept chart
    renderProgressBars('dept-chart', d.deptStats.map(r => ({
      label: r.Name, value: r['Head-Count'], color: 'var(--violet)'
    })));

    // Recent Patients
    const pTbody = document.querySelector('#dash-patients-table tbody');
    pTbody.innerHTML = d.recentPatients.map(p => `
      <tr>
        <td class="id-cell">${p['P-ID']}</td>
        <td>${p.Name}</td>
        <td>${p.Age ?? '–'}</td>
        <td>${genderBadge(p.Gender)}</td>
        <td>${p['Blood-Group'] ? `<span class="badge badge-blue">${p['Blood-Group']}</span>` : '–'}</td>
      </tr>`).join('') || emptyRow(5);

    // Upcoming Appointments
    const aTbody = document.querySelector('#dash-appointments-table tbody');
    aTbody.innerHTML = d.upcomingAppointments.map(a => `
      <tr>
        <td class="id-cell">${a['A-ID']}</td>
        <td>${a.PatientName}</td>
        <td>${a.DoctorName}</td>
        <td>${statusBadge(a.Status)}</td>
      </tr>`).join('') || emptyRow(4);

  } catch (err) {
    showToast('Dashboard load failed: ' + err.message, true);
  }
}

/* ══════════════════════════════════════════════════════════════
   APPOINTMENTS
══════════════════════════════════════════════════════════════ */
async function loadAppointments() {
  try {
    const rows = await apiCall('/appointments');
    _appointments = rows;

    const scheduled = rows.filter(r => r.Status === 'Scheduled').length;
    const completed  = rows.filter(r => r.Status === 'Completed').length;
    const cancelled  = rows.filter(r => r.Status === 'Cancelled').length;

    renderStatCards('apt-stats', [
      { icon: '📅', label: 'Total',     value: rows.length,  color: '#6c63ff' },
      { icon: '🟢', label: 'Scheduled', value: scheduled,    color: '#10d988' },
      { icon: '✅', label: 'Completed', value: completed,    color: '#00d4ff' },
      { icon: '❌', label: 'Cancelled', value: cancelled,    color: '#ff4d6d' },
    ]);

    const tbody = document.querySelector('#appointments-table tbody');
    tbody.innerHTML = rows.map(a => `
      <tr>
        <td class="id-cell">${a['A-ID']}</td>
        <td>${a.PatientName}</td>
        <td>${a.DoctorName}</td>
        <td>${a['R-ID'] ? `<span class="badge badge-gray">${a.RoomType || 'Room '+a['R-ID']}</span>` : '–'}</td>
        <td>${a['Scheduled-At'] ? fmtDate(a['Scheduled-At']) : '–'}</td>
        <td>${statusBadge(a.Status)}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;">${a.Notes || '–'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editAppointment(${a['A-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteAppointment(${a['A-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(8);
  } catch (e) { showToast('Error loading appointments', true); }
}

async function openAppointmentModal() {
  await populateDropdowns();
  document.getElementById('appointment-modal-title').textContent = 'New Appointment';
  openModal('appointment-modal');
}

async function editAppointment(id) {
  try {
    await populateDropdowns();
    const a = await apiCall(`/appointments/${id}`);
    document.getElementById('a-id-hidden').value = a['A-ID'];
    setSelectValue('a-pid', a['P-ID']);
    setSelectValue('a-did', a['D-E-ID']);
    setSelectValue('a-rid', a['R-ID'] ?? '');
    if (a['Scheduled-At']) {
      document.getElementById('a-scheduled').value = toDateTimeLocal(a['Scheduled-At']);
    }
    setSelectValue('a-status', a.Status);
    document.getElementById('a-notes').value = a.Notes || '';
    document.getElementById('appointment-modal-title').textContent = 'Edit Appointment';
    openModal('appointment-modal');
  } catch (e) { showToast('Could not load appointment', true); }
}

async function saveAppointment() {
  const id = document.getElementById('a-id-hidden').value;
  let sa = document.getElementById('a-scheduled').value;
  if (sa) sa = new Date(sa).toISOString().slice(0,19).replace('T',' ');
  const payload = {
    'P-ID':         document.getElementById('a-pid').value,
    'D-E-ID':       document.getElementById('a-did').value,
    'R-ID':         document.getElementById('a-rid').value || null,
    'Scheduled-At': sa,
    Status:         document.getElementById('a-status').value,
    Notes:          document.getElementById('a-notes').value,
  };
  try {
    if (id) await apiCall(`/appointments/${id}`, 'PUT', payload);
    else    await apiCall('/appointments', 'POST', payload);
    showToast('Appointment saved ✓');
    closeModal(); loadAppointments(); loadDashboard();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deleteAppointment(id) {
  if (!confirm('Delete appointment #' + id + '?')) return;
  try {
    await apiCall(`/appointments/${id}`, 'DELETE');
    showToast('Appointment deleted');
    loadAppointments(); loadDashboard();
  } catch (e) { showToast('Error deleting', true); }
}

/* ══════════════════════════════════════════════════════════════
   PATIENTS
══════════════════════════════════════════════════════════════ */
async function loadPatients() {
  try {
    const rows = await apiCall('/patients');
    _patients = rows;
    const male   = rows.filter(p => p.Gender === 'Male').length;
    const female  = rows.filter(p => p.Gender === 'Female').length;
    const avgAge  = rows.length ? Math.round(rows.reduce((s,p) => s+(p.Age||0),0)/rows.length) : 0;

    renderStatCards('patient-stats', [
      { icon: '👥', label: 'Total Patients', value: rows.length,  color: '#6c63ff' },
      { icon: '👨', label: 'Male',           value: male,         color: '#00d4ff' },
      { icon: '👩', label: 'Female',         value: female,       color: '#ff4d6d' },
      { icon: '📊', label: 'Avg. Age',       value: avgAge + ' y',color: '#10d988' },
    ]);

    const tbody = document.querySelector('#patients-table tbody');
    tbody.innerHTML = rows.map(p => `
      <tr>
        <td class="id-cell">${p['P-ID']}</td>
        <td><strong>${p.Name}</strong></td>
        <td>${p.DOB ? p.DOB.split('T')[0] : '–'}</td>
        <td>${p.Age ?? '–'}</td>
        <td>${genderBadge(p.Gender)}</td>
        <td>${p['Mob-No'] || '–'}</td>
        <td>${p['Blood-Group'] ? `<span class="badge badge-blue">${p['Blood-Group']}</span>` : '–'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editPatient(${p['P-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deletePatient(${p['P-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(8);
  } catch (e) { showToast('Error loading patients', true); }
}

async function editPatient(id) {
  try {
    const p = await apiCall(`/patients/${id}`);
    document.getElementById('p-id-hidden').value = p['P-ID'];
    document.getElementById('p-name').value       = p.Name;
    document.getElementById('p-dob').value        = p.DOB ? p.DOB.split('T')[0] : '';
    document.getElementById('p-age').value        = p.Age ?? '';
    setSelectValue('p-gender', p.Gender);
    document.getElementById('p-mob').value        = p['Mob-No'] || '';
    setSelectValue('p-blood', p['Blood-Group'] || '');
    document.getElementById('patient-modal-title').textContent = 'Edit Patient';
    openModal('patient-modal');
  } catch (e) { showToast('Could not load patient', true); }
}

async function savePatient() {
  const id = document.getElementById('p-id-hidden').value;
  const payload = {
    Name:          document.getElementById('p-name').value,
    DOB:           document.getElementById('p-dob').value || null,
    Age:           document.getElementById('p-age').value || null,
    Gender:        document.getElementById('p-gender').value || null,
    'Mob-No':      document.getElementById('p-mob').value || null,
    'Blood-Group': document.getElementById('p-blood').value || null,
  };
  try {
    if (id) await apiCall(`/patients/${id}`, 'PUT', payload);
    else    await apiCall('/patients', 'POST', payload);
    showToast('Patient saved ✓');
    closeModal(); loadPatients(); loadDashboard();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deletePatient(id) {
  if (!confirm('Delete patient #' + id + '?')) return;
  try {
    await apiCall(`/patients/${id}`, 'DELETE');
    showToast('Patient deleted');
    loadPatients(); loadDashboard();
  } catch (e) { showToast('Error deleting', true); }
}

/* ══════════════════════════════════════════════════════════════
   DOCTORS
══════════════════════════════════════════════════════════════ */
async function loadDoctors() {
  try {
    const rows = await apiCall('/doctors');
    _doctors = rows;
    const depts = [...new Set(rows.map(d => d.DeptName).filter(Boolean))].length;
    const avgSal = rows.length ? Math.round(rows.reduce((s,d) => s+Number(d.Salary||0),0)/rows.length) : 0;

    renderStatCards('doctor-stats', [
      { icon: '👨‍⚕️', label: 'Total Doctors',  value: rows.length,  color: '#6c63ff' },
      { icon: '🏢',   label: 'Departments',     value: depts,        color: '#00d4ff' },
      { icon: '💰',   label: 'Avg. Salary',     value: '₹'+avgSal.toLocaleString('en-IN'), color: '#10d988' },
    ]);

    const tbody = document.querySelector('#doctors-table tbody');
    tbody.innerHTML = rows.map(d => `
      <tr>
        <td class="id-cell">${d['E-ID']}</td>
        <td><strong>${d.Name}</strong></td>
        <td>${d.DeptName ? `<span class="badge badge-violet">${d.DeptName}</span>` : (d.Dept||'–')}</td>
        <td>${d.Qualification || '–'}</td>
        <td>₹${Number(d.Salary||0).toLocaleString('en-IN')}</td>
        <td>${d['Mob-No'] || '–'}</td>
        <td>${d.City || '–'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editDoctor(${d['E-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteDoctor(${d['E-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(8);
  } catch (e) { showToast('Error loading doctors', true); }
}

async function editDoctor(id) {
  try {
    await loadDepartmentsIntoSelect('d-dept-id');
    const d = await apiCall(`/doctors/${id}`);
    document.getElementById('d-id-hidden').value = d['E-ID'];
    document.getElementById('d-name').value       = d.Name;
    setSelectValue('d-dept-id', d['Dept-ID'] ?? '');
    document.getElementById('d-qual').value       = d.Qualification || '';
    setSelectValue('d-sex', d.Sex || '');
    document.getElementById('d-salary').value     = d.Salary ?? '';
    document.getElementById('d-mob').value        = d['Mob-No'] || '';
    document.getElementById('d-city').value       = d.City || '';
    document.getElementById('d-state').value      = d.State || '';
    document.getElementById('d-pin').value        = d['Pin-no'] || '';
    document.getElementById('d-address').value    = d.Address || '';
    document.getElementById('doctor-modal-title').textContent = 'Edit Doctor';
    openModal('doctor-modal');
  } catch (e) { showToast('Could not load doctor', true); }
}

async function openDoctorModal() {
  await loadDepartmentsIntoSelect('d-dept-id');
  document.getElementById('doctor-modal-title').textContent = 'New Doctor';
  openModal('doctor-modal');
}

async function saveDoctor() {
  const id = document.getElementById('d-id-hidden').value;
  const payload = {
    Name:          document.getElementById('d-name').value,
    'Dept-ID':     document.getElementById('d-dept-id').value || null,
    Qualification: document.getElementById('d-qual').value,
    Sex:           document.getElementById('d-sex').value || null,
    Salary:        document.getElementById('d-salary').value || null,
    'Mob-No':      document.getElementById('d-mob').value || null,
    City:          document.getElementById('d-city').value || null,
    State:         document.getElementById('d-state').value || null,
    'Pin-no':      document.getElementById('d-pin').value || null,
    Address:       document.getElementById('d-address').value || null,
  };
  try {
    if (id) await apiCall(`/doctors/${id}`, 'PUT', payload);
    else    await apiCall('/doctors', 'POST', payload);
    showToast('Doctor saved ✓');
    closeModal(); loadDoctors(); loadDashboard();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deleteDoctor(id) {
  if (!confirm('Delete doctor #' + id + '?')) return;
  try {
    await apiCall(`/doctors/${id}`, 'DELETE');
    showToast('Doctor deleted');
    loadDoctors(); loadDashboard();
  } catch (e) { showToast('Error deleting', true); }
}

/* ══════════════════════════════════════════════════════════════
   NURSES  (New Entity)
══════════════════════════════════════════════════════════════ */
async function loadNurses() {
  try {
    const rows = await apiCall('/nurses');
    const shiftCount = (s) => rows.filter(n => n.Shift === s).length;

    renderStatCards('nurse-stats', [
      { icon: '👩‍⚕️', label: 'Total Nurses',  value: rows.length,           color: '#a855f7' },
      { icon: '🌅',   label: 'Morning',        value: shiftCount('Morning'), color: '#ffb347' },
      { icon: '🌆',   label: 'Evening',        value: shiftCount('Evening'), color: '#6c63ff' },
      { icon: '🌙',   label: 'Night',          value: shiftCount('Night'),   color: '#00d4ff' },
    ]);

    const tbody = document.querySelector('#nurses-table tbody');
    tbody.innerHTML = rows.map(n => `
      <tr>
        <td class="id-cell">${n['E-ID']}</td>
        <td><strong>${n.Name}</strong></td>
        <td>${n.DeptName ? `<span class="badge badge-violet">${n.DeptName}</span>` : '–'}</td>
        <td><span class="badge badge-gray">${n['License-No'] || '–'}</span></td>
        <td>${shiftBadge(n.Shift)}</td>
        <td>₹${Number(n.Salary||0).toLocaleString('en-IN')}</td>
        <td>${n['Mob-No'] || '–'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editNurse(${n['E-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteNurse(${n['E-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(8);
  } catch (e) { showToast('Error loading nurses', true); }
}

async function editNurse(id) {
  try {
    await loadDepartmentsIntoSelect('n-dept-id');
    const n = await apiCall(`/nurses/${id}`);
    document.getElementById('n-id-hidden').value  = n['E-ID'];
    document.getElementById('n-name').value       = n.Name;
    setSelectValue('n-dept-id', n['Dept-ID'] ?? '');
    document.getElementById('n-license').value    = n['License-No'] || '';
    setSelectValue('n-shift', n.Shift || 'Morning');
    document.getElementById('n-salary').value     = n.Salary ?? '';
    document.getElementById('n-mob').value        = n['Mob-No'] || '';
    document.getElementById('n-city').value       = n.City || '';
    document.getElementById('n-state').value      = n.State || '';
    document.getElementById('n-pin').value        = n['Pin-no'] || '';
    document.getElementById('n-address').value    = n.Address || '';
    document.getElementById('nurse-modal-title').textContent = 'Edit Nurse';
    openModal('nurse-modal');
  } catch (e) { showToast('Could not load nurse', true); }
}

async function openNurseModal() {
  await loadDepartmentsIntoSelect('n-dept-id');
  document.getElementById('nurse-modal-title').textContent = 'New Nurse';
  openModal('nurse-modal');
}

async function saveNurse() {
  const id = document.getElementById('n-id-hidden').value;
  const payload = {
    Name:          document.getElementById('n-name').value,
    'Dept-ID':     document.getElementById('n-dept-id').value || null,
    'License-No':  document.getElementById('n-license').value || null,
    Shift:         document.getElementById('n-shift').value || 'Morning',
    Salary:        document.getElementById('n-salary').value || null,
    'Mob-No':      document.getElementById('n-mob').value || null,
    City:          document.getElementById('n-city').value || null,
    State:         document.getElementById('n-state').value || null,
    'Pin-no':      document.getElementById('n-pin').value || null,
    Address:       document.getElementById('n-address').value || null,
  };
  try {
    if (id) await apiCall(`/nurses/${id}`, 'PUT', payload);
    else    await apiCall('/nurses', 'POST', payload);
    showToast('Nurse saved ✓');
    closeModal(); loadNurses(); loadDashboard();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deleteNurse(id) {
  if (!confirm('Delete nurse #' + id + '?')) return;
  try {
    await apiCall(`/nurses/${id}`, 'DELETE');
    showToast('Nurse deleted');
    loadNurses(); loadDashboard();
  } catch (e) { showToast('Error deleting', true); }
}

/* ══════════════════════════════════════════════════════════════
   DEPARTMENTS  (New Entity)
══════════════════════════════════════════════════════════════ */
async function loadDepartments() {
  try {
    const rows = await apiCall('/departments');
    _departments = rows;
    const totalStaff = rows.reduce((s,d) => s+Number(d['Head-Count']||0), 0);

    renderStatCards('dept-stats', [
      { icon: '🏢', label: 'Departments', value: rows.length,  color: '#a855f7' },
      { icon: '👥', label: 'Total Staff', value: totalStaff,   color: '#6c63ff' },
    ]);

    const tbody = document.querySelector('#departments-table tbody');
    tbody.innerHTML = rows.map(d => `
      <tr>
        <td class="id-cell">${d['Dept-ID']}</td>
        <td><strong>${d.Name}</strong></td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;">${d.Description || '–'}</td>
        <td><span class="badge badge-blue">${d['Head-Count'] || 0} staff</span></td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editDepartment(${d['Dept-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteDepartment(${d['Dept-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(5);
  } catch (e) { showToast('Error loading departments', true); }
}

async function editDepartment(id) {
  try {
    const d = await apiCall(`/departments/${id}`);
    document.getElementById('dept-id-hidden').value = d['Dept-ID'];
    document.getElementById('dept-name').value       = d.Name;
    document.getElementById('dept-desc').value       = d.Description || '';
    document.getElementById('dept-hc').value         = d['Head-Count'] ?? 0;
    document.getElementById('department-modal-title').textContent = 'Edit Department';
    openModal('department-modal');
  } catch (e) { showToast('Could not load department', true); }
}

async function saveDepartment() {
  const id = document.getElementById('dept-id-hidden').value;
  const payload = {
    Name:         document.getElementById('dept-name').value,
    Description:  document.getElementById('dept-desc').value || null,
    'Head-Count': document.getElementById('dept-hc').value || 0,
  };
  try {
    if (id) await apiCall(`/departments/${id}`, 'PUT', payload);
    else    await apiCall('/departments', 'POST', payload);
    showToast('Department saved ✓');
    closeModal(); loadDepartments(); loadDashboard();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deleteDepartment(id) {
  if (!confirm('Delete department #' + id + '?')) return;
  try {
    await apiCall(`/departments/${id}`, 'DELETE');
    showToast('Department deleted');
    loadDepartments(); loadDashboard();
  } catch (e) { showToast('Error deleting', true); }
}

/* ══════════════════════════════════════════════════════════════
   ROOMS
══════════════════════════════════════════════════════════════ */
async function loadRooms() {
  try {
    const rows = await apiCall('/rooms');
    _rooms = rows;
    const avail  = rows.filter(r => r.Availability).length;
    const totalCap = rows.reduce((s,r) => s+Number(r.Capacity||0), 0);

    renderStatCards('room-stats', [
      { icon: '🚪', label: 'Total Rooms',  value: rows.length,  color: '#6c63ff' },
      { icon: '✅', label: 'Available',    value: avail,        color: '#10d988' },
      { icon: '🔴', label: 'Occupied',     value: rows.length-avail, color: '#ff4d6d' },
      { icon: '🛏️', label: 'Total Beds',   value: totalCap,     color: '#00d4ff' },
    ]);

    const tbody = document.querySelector('#rooms-table tbody');
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td class="id-cell">${r['R-ID']}</td>
        <td><span class="badge badge-gray">${r.Type}</span></td>
        <td>${r.Capacity}</td>
        <td>Floor ${r.Floor || 1}</td>
        <td>₹${Number(r['Daily-Rate']||0).toLocaleString('en-IN')}/day</td>
        <td>${r.Availability ? '<span class="badge badge-green">Available</span>' : '<span class="badge badge-red">Occupied</span>'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editRoom(${r['R-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteRoom(${r['R-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(7);
  } catch (e) { showToast('Error loading rooms', true); }
}

async function editRoom(id) {
  try {
    const r = await apiCall(`/rooms/${id}`);
    document.getElementById('r-id-hidden').value = r['R-ID'];
    document.getElementById('r-type').value       = r.Type || '';
    document.getElementById('r-capacity').value   = r.Capacity ?? '';
    document.getElementById('r-floor').value      = r.Floor ?? 1;
    document.getElementById('r-rate').value       = r['Daily-Rate'] ?? 0;
    setSelectValue('r-avail', r.Availability ?? 1);
    document.getElementById('room-modal-title').textContent = 'Edit Room';
    openModal('room-modal');
  } catch (e) { showToast('Could not load room', true); }
}

async function saveRoom() {
  const id = document.getElementById('r-id-hidden').value;
  const payload = {
    Type:         document.getElementById('r-type').value,
    Capacity:     document.getElementById('r-capacity').value || 1,
    Floor:        document.getElementById('r-floor').value || 1,
    'Daily-Rate': document.getElementById('r-rate').value || 0,
    Availability: document.getElementById('r-avail').value,
  };
  try {
    if (id) await apiCall(`/rooms/${id}`, 'PUT', payload);
    else    await apiCall('/rooms', 'POST', payload);
    showToast('Room saved ✓');
    closeModal(); loadRooms(); loadDashboard();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deleteRoom(id) {
  if (!confirm('Delete room #' + id + '?')) return;
  try {
    await apiCall(`/rooms/${id}`, 'DELETE');
    showToast('Room deleted');
    loadRooms(); loadDashboard();
  } catch (e) { showToast('Error deleting', true); }
}

/* ══════════════════════════════════════════════════════════════
   MEDICATIONS
══════════════════════════════════════════════════════════════ */
async function loadMedications() {
  try {
    const rows = await apiCall('/medications');
    _medications = rows;
    const totalStock = rows.reduce((s,m) => s+Number(m['Stock-Qty']||0), 0);
    const lowStock = rows.filter(m => Number(m['Stock-Qty']||0) < 100).length;

    renderStatCards('med-stats', [
      { icon: '💊', label: 'Total Meds',  value: rows.length,  color: '#10d988' },
      { icon: '📦', label: 'Total Stock', value: totalStock,   color: '#6c63ff' },
      { icon: '⚠️', label: 'Low Stock',   value: lowStock,     color: '#ff4d6d' },
    ]);

    const tbody = document.querySelector('#medications-table tbody');
    tbody.innerHTML = rows.map(m => `
      <tr>
        <td class="id-cell">${m['MED-ID']}</td>
        <td><strong>${m.Name}</strong></td>
        <td><span class="badge badge-gray">${m['Dosage-Form'] || '–'}</span></td>
        <td>${m.SupplierName || '–'}</td>
        <td>₹${Number(m['Unit-Price']||0).toFixed(2)}</td>
        <td>${Number(m['Stock-Qty']||0) < 100 ? `<span class="badge badge-red">${m['Stock-Qty']} ⚠</span>` : `<span class="badge badge-green">${m['Stock-Qty']||0}</span>`}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editMedication(${m['MED-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteMedication(${m['MED-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(7);
  } catch (e) { showToast('Error loading medications', true); }
}

async function editMedication(id) {
  try {
    await loadSuppliersIntoSelect('m-sup-id');
    const m = await apiCall(`/medications/${id}`);
    document.getElementById('m-id-hidden').value = m['MED-ID'];
    document.getElementById('m-name').value       = m.Name;
    document.getElementById('m-form').value       = m['Dosage-Form'] || '';
    setSelectValue('m-sup-id', m['Sup-ID'] ?? '');
    document.getElementById('m-price').value      = m['Unit-Price'] ?? 0;
    document.getElementById('m-stock').value      = m['Stock-Qty'] ?? 0;
    document.getElementById('medication-modal-title').textContent = 'Edit Medication';
    openModal('medication-modal');
  } catch (e) { showToast('Could not load medication', true); }
}

async function openMedicationModal() {
  await loadSuppliersIntoSelect('m-sup-id');
  document.getElementById('medication-modal-title').textContent = 'New Medication';
  openModal('medication-modal');
}

async function saveMedication() {
  const id = document.getElementById('m-id-hidden').value;
  const payload = {
    Name:          document.getElementById('m-name').value,
    'Dosage-Form': document.getElementById('m-form').value || null,
    'Sup-ID':      document.getElementById('m-sup-id').value || null,
    'Unit-Price':  document.getElementById('m-price').value || 0,
    'Stock-Qty':   document.getElementById('m-stock').value || 0,
  };
  try {
    if (id) await apiCall(`/medications/${id}`, 'PUT', payload);
    else    await apiCall('/medications', 'POST', payload);
    showToast('Medication saved ✓');
    closeModal(); loadMedications();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deleteMedication(id) {
  if (!confirm('Delete medication #' + id + '?')) return;
  try {
    await apiCall(`/medications/${id}`, 'DELETE');
    showToast('Medication deleted');
    loadMedications();
  } catch (e) { showToast('Error deleting', true); }
}

/* ══════════════════════════════════════════════════════════════
   BILLS  (New Entity)
══════════════════════════════════════════════════════════════ */
async function loadBills() {
  try {
    const rows = await apiCall('/bills');
    const paid     = rows.filter(b => b.Status === 'Paid');
    const pending   = rows.filter(b => b.Status === 'Pending');
    const cancelled = rows.filter(b => b.Status === 'Cancelled');
    const totalRev  = paid.reduce((s,b) => s+Number(b.Amount||0), 0);

    renderStatCards('bill-stats', [
      { icon: '💳', label: 'Total Bills',  value: rows.length,  color: '#6c63ff' },
      { icon: '⏳', label: 'Pending',      value: pending.length, color: '#ffb347' },
      { icon: '✅', label: 'Paid',         value: paid.length,  color: '#10d988' },
      { icon: '💰', label: 'Revenue',      value: '₹'+totalRev.toLocaleString('en-IN'), color: '#00d4ff' },
    ]);

    const tbody = document.querySelector('#bills-table tbody');
    tbody.innerHTML = rows.map(b => `
      <tr>
        <td class="id-cell">${b['Bill-ID']}</td>
        <td>${b.PatientName}</td>
        <td>${b['A-ID'] ? `<span class="badge badge-gray">#${b['A-ID']}</span>` : '–'}</td>
        <td><strong>₹${Number(b.Amount||0).toLocaleString('en-IN')}</strong></td>
        <td>${billStatusBadge(b.Status)}</td>
        <td>${b['Issued-At'] ? fmtDate(b['Issued-At']) : '–'}</td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;">${b.Notes||'–'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editBill(${b['Bill-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteBill(${b['Bill-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(8);
  } catch (e) { showToast('Error loading bills', true); }
}

async function editBill(id) {
  try {
    await populateBillDropdowns();
    const b = await apiCall(`/bills/${id}`);
    document.getElementById('b-id-hidden').value = b['Bill-ID'];
    setSelectValue('b-pid', b['P-ID']);
    setSelectValue('b-aid', b['A-ID'] ?? '');
    document.getElementById('b-amount').value = b.Amount ?? '';
    setSelectValue('b-status', b.Status || 'Pending');
    document.getElementById('b-notes').value = b.Notes || '';
    document.getElementById('bill-modal-title').textContent = 'Edit Bill';
    openModal('bill-modal');
  } catch (e) { showToast('Could not load bill', true); }
}

async function openBillModal() {
  await populateBillDropdowns();
  document.getElementById('bill-modal-title').textContent = 'Create Bill';
  openModal('bill-modal');
}

async function saveBill() {
  const id = document.getElementById('b-id-hidden').value;
  const payload = {
    'P-ID':   document.getElementById('b-pid').value,
    'A-ID':   document.getElementById('b-aid').value || null,
    Amount:   document.getElementById('b-amount').value || 0,
    Status:   document.getElementById('b-status').value,
    Notes:    document.getElementById('b-notes').value || null,
  };
  try {
    if (id) await apiCall(`/bills/${id}`, 'PUT', payload);
    else    await apiCall('/bills', 'POST', payload);
    showToast('Bill saved ✓');
    closeModal(); loadBills(); loadDashboard();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deleteBill(id) {
  if (!confirm('Delete bill #' + id + '?')) return;
  try {
    await apiCall(`/bills/${id}`, 'DELETE');
    showToast('Bill deleted');
    loadBills(); loadDashboard();
  } catch (e) { showToast('Error deleting', true); }
}

/* ══════════════════════════════════════════════════════════════
   PRESCRIPTIONS
══════════════════════════════════════════════════════════════ */
async function loadPrescriptions() {
  try {
    const rows = await apiCall('/prescriptions');

    renderStatCards('rx-stats', [
      { icon: '📝', label: 'Total Prescriptions', value: rows.length, color: '#6c63ff' },
    ]);

    const tbody = document.querySelector('#prescriptions-table tbody');
    tbody.innerHTML = rows.map(pr => `
      <tr>
        <td class="id-cell">${pr['PR-ID']}</td>
        <td>${pr.PatientName}</td>
        <td>${pr.DoctorName}</td>
        <td>${pr['Created-At'] ? fmtDate(pr['Created-At']) : '–'}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;">${pr.Notes||'–'}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="managePrescriptionItems(${pr['PR-ID']})">
            💊 Items
          </button>
        </td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editPrescription(${pr['PR-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deletePrescription(${pr['PR-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(7);
  } catch (e) { showToast('Error loading prescriptions', true); }
}

async function editPrescription(id) {
  try {
    await populatePrescriptionDropdowns();
    const pr = await apiCall(`/prescriptions/${id}`);
    document.getElementById('pr-id-hidden').value = pr['PR-ID'];
    setSelectValue('pr-pid', pr['P-ID']);
    setSelectValue('pr-did', pr['D-E-ID']);
    document.getElementById('pr-notes').value = pr.Notes || '';
    document.getElementById('prescription-modal-title').textContent = 'Edit Prescription';
    openModal('prescription-modal');
  } catch (e) { showToast('Could not load prescription', true); }
}

async function openPrescriptionModal() {
  await populatePrescriptionDropdowns();
  document.getElementById('prescription-modal-title').textContent = 'New Prescription';
  openModal('prescription-modal');
}

async function savePrescription() {
  const id = document.getElementById('pr-id-hidden').value;
  const payload = {
    'P-ID':   document.getElementById('pr-pid').value,
    'D-E-ID': document.getElementById('pr-did').value,
    Notes:    document.getElementById('pr-notes').value || null,
  };
  try {
    if (id) await apiCall(`/prescriptions/${id}`, 'PUT', payload);
    else    await apiCall('/prescriptions', 'POST', payload);
    showToast('Prescription saved ✓');
    closeModal(); loadPrescriptions();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deletePrescription(id) {
  if (!confirm('Delete prescription #' + id + '?')) return;
  try {
    await apiCall(`/prescriptions/${id}`, 'DELETE');
    showToast('Prescription deleted');
    loadPrescriptions();
  } catch (e) { showToast('Error deleting', true); }
}

async function managePrescriptionItems(prId) {
  document.getElementById('pri-prid-hidden').value = prId;
  document.getElementById('pri-title').textContent = `Prescription Items — PR-${prId}`;
  document.getElementById('pri-dosage').value = '';
  document.getElementById('pri-instructions').value = '';
  await loadMedicationsIntoSelect('pri-medid');
  openModal('prescription-items-modal');
  reloadPrescriptionItems(prId);
}

async function reloadPrescriptionItems(prId) {
  try {
    const items = await apiCall(`/prescriptions/${prId}/items`);
    const tbody = document.querySelector('#prescription-items-table tbody');
    tbody.innerHTML = items.map(i => `
      <tr>
        <td>${i.MedicationName}</td>
        <td>${i.Dosage}</td>
        <td>${i.Instructions || '–'}</td>
        <td>
          <button class="btn-icon btn-del" onclick="deletePrescriptionItem(${prId}, ${i['MED-ID']})" title="Remove">✕</button>
        </td>
      </tr>`).join('') || emptyRow(4);
  } catch (e) { showToast('Error loading items', true); }
}

async function savePrescriptionItem() {
  const prId = document.getElementById('pri-prid-hidden').value;
  const payload = {
    'MED-ID':      document.getElementById('pri-medid').value,
    Dosage:        document.getElementById('pri-dosage').value,
    Instructions:  document.getElementById('pri-instructions').value,
  };
  try {
    await apiCall(`/prescriptions/${prId}/items`, 'POST', payload);
    showToast('Item added ✓');
    document.getElementById('pri-dosage').value = '';
    document.getElementById('pri-instructions').value = '';
    reloadPrescriptionItems(prId);
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deletePrescriptionItem(prId, medId) {
  if (!confirm('Remove this medication from prescription?')) return;
  try {
    await apiCall(`/prescriptions/${prId}/items/${medId}`, 'DELETE');
    showToast('Item removed');
    reloadPrescriptionItems(prId);
  } catch (e) { showToast('Error removing item', true); }
}

/* ══════════════════════════════════════════════════════════════
   SUPPLIERS  (New Entity)
══════════════════════════════════════════════════════════════ */
async function loadSuppliers() {
  try {
    const rows = await apiCall('/suppliers');
    _suppliers = rows;
    const states = [...new Set(rows.map(s => s.State).filter(Boolean))].length;

    renderStatCards('sup-stats', [
      { icon: '🏭', label: 'Total Suppliers', value: rows.length, color: '#6c63ff' },
      { icon: '🗺️', label: 'States Covered',  value: states,      color: '#10d988' },
    ]);

    const tbody = document.querySelector('#suppliers-table tbody');
    tbody.innerHTML = rows.map(s => `
      <tr>
        <td class="id-cell">${s['Sup-ID']}</td>
        <td><strong>${s.Name}</strong></td>
        <td>${s.ContactNo || '–'}</td>
        <td>${s.Email || '–'}</td>
        <td>${s.City || '–'}</td>
        <td>${s.State || '–'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-edit" onclick="editSupplier(${s['Sup-ID']})" title="Edit">✎</button>
          <button class="btn-icon btn-del"  onclick="deleteSupplier(${s['Sup-ID']})" title="Delete">✕</button>
        </div></td>
      </tr>`).join('') || emptyRow(7);
  } catch (e) { showToast('Error loading suppliers', true); }
}

async function editSupplier(id) {
  try {
    const s = await apiCall(`/suppliers/${id}`);
    document.getElementById('s-id-hidden').value = s['Sup-ID'];
    document.getElementById('s-name').value      = s.Name;
    document.getElementById('s-contact').value   = s.ContactNo || '';
    document.getElementById('s-email').value     = s.Email || '';
    document.getElementById('s-city').value      = s.City || '';
    document.getElementById('s-state').value     = s.State || '';
    document.getElementById('s-address').value   = s.Address || '';
    document.getElementById('supplier-modal-title').textContent = 'Edit Supplier';
    openModal('supplier-modal');
  } catch (e) { showToast('Could not load supplier', true); }
}

async function saveSupplier() {
  const id = document.getElementById('s-id-hidden').value;
  const payload = {
    Name:      document.getElementById('s-name').value,
    ContactNo: document.getElementById('s-contact').value || null,
    Email:     document.getElementById('s-email').value || null,
    City:      document.getElementById('s-city').value || null,
    State:     document.getElementById('s-state').value || null,
    Address:   document.getElementById('s-address').value || null,
  };
  try {
    if (id) await apiCall(`/suppliers/${id}`, 'PUT', payload);
    else    await apiCall('/suppliers', 'POST', payload);
    showToast('Supplier saved ✓');
    closeModal(); loadSuppliers();
  } catch (e) { showToast('Error: ' + e.message, true); }
}

async function deleteSupplier(id) {
  if (!confirm('Delete supplier #' + id + '?')) return;
  try {
    await apiCall(`/suppliers/${id}`, 'DELETE');
    showToast('Supplier deleted');
    loadSuppliers();
  } catch (e) { showToast('Error deleting', true); }
}

/* ══════════════════════════════════════════════════════════════
   DROPDOWN POPULATION HELPERS
══════════════════════════════════════════════════════════════ */
async function populateDropdowns() {
  const [patients, doctors, rooms] = await Promise.all([
    apiCall('/patients').catch(() => []),
    apiCall('/doctors').catch(() => []),
    apiCall('/rooms').catch(() => []),
  ]);
  _patients = patients;
  _doctors  = doctors;
  _rooms    = rooms;

  fillSelect('a-pid', patients.map(p => ({ value: p['P-ID'], label: `${p.Name}` })));
  fillSelect('a-did', doctors.map(d => ({ value: d['E-ID'], label: `${d.Name} (${d.DeptName || d.Dept || '–'})` })));
  fillSelectOptional('a-rid', rooms.filter(r => r.Availability).map(r => ({
    value: r['R-ID'], label: `${r.Type} (Floor ${r.Floor||1})`
  })));
}

async function populatePrescriptionDropdowns() {
  const [patients, doctors] = await Promise.all([
    apiCall('/patients').catch(() => []),
    apiCall('/doctors').catch(() => []),
  ]);
  fillSelect('pr-pid', patients.map(p => ({ value: p['P-ID'], label: p.Name })));
  fillSelect('pr-did', doctors.map(d => ({ value: d['E-ID'], label: `${d.Name}` })));
}

async function populateBillDropdowns() {
  const [patients, appointments] = await Promise.all([
    apiCall('/patients').catch(() => []),
    apiCall('/appointments').catch(() => []),
  ]);
  fillSelect('b-pid', patients.map(p => ({ value: p['P-ID'], label: p.Name })));
  fillSelectOptional('b-aid', appointments.map(a => ({
    value: a['A-ID'],
    label: `APT-${a['A-ID']} — ${a.PatientName}`
  })));
}

async function loadDepartmentsIntoSelect(selectId) {
  const depts = await apiCall('/departments').catch(() => []);
  _departments = depts;
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const curVal = sel.value;
  sel.innerHTML = `<option value="">— Select Department —</option>` +
    depts.map(d => `<option value="${d['Dept-ID']}">${d.Name}</option>`).join('');
  if (curVal) sel.value = curVal;
}

async function loadSuppliersIntoSelect(selectId) {
  const sups = await apiCall('/suppliers').catch(() => []);
  _suppliers = sups;
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const curVal = sel.value;
  sel.innerHTML = `<option value="">— None —</option>` +
    sups.map(s => `<option value="${s['Sup-ID']}">${s.Name}</option>`).join('');
  if (curVal) sel.value = curVal;
}

async function loadMedicationsIntoSelect(selectId) {
  const meds = await apiCall('/medications').catch(() => []);
  _medications = meds;
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">— Select Medication —</option>` +
    meds.map(m => `<option value="${m['MED-ID']}">${m.Name} (${m['Dosage-Form']||'–'})</option>`).join('');
}

function fillSelect(id, options) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">— Select —</option>` +
    options.map(o => `<option value="${o.value}">${escHtml(o.label)}</option>`).join('');
}

function fillSelectOptional(id, options) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">— None —</option>` +
    options.map(o => `<option value="${o.value}">${escHtml(o.label)}</option>`).join('');
}

function setSelectValue(id, val) {
  const sel = document.getElementById(id);
  if (sel) sel.value = val ?? '';
}

/* ══════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════════════════════════ */
function fmtDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function toDateTimeLocal(d) {
  const dt = new Date(d);
  return new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,16);
}

function escHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function emptyRow(cols) {
  return `<tr><td colspan="${cols}">
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">No records found</div>
    </div>
  </td></tr>`;
}

function statusBadge(s) {
  const map = { Scheduled: 'badge-blue', Completed: 'badge-green', Cancelled: 'badge-red' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s}</span>`;
}

function billStatusBadge(s) {
  const map = { Pending: 'badge-amber', Paid: 'badge-green', Cancelled: 'badge-red' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s}</span>`;
}

function genderBadge(g) {
  if (!g) return '–';
  const map = { Male: 'badge-blue', Female: 'badge-violet', Other: 'badge-gray' };
  return `<span class="badge ${map[g]||'badge-gray'}">${g}</span>`;
}

function shiftBadge(s) {
  const map = { Morning: 'badge-amber', Evening: 'badge-blue', Night: 'badge-gray' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s||'–'}</span>`;
}

/* ══════════════════════════════════════════════════════════════
   BUTTON onclick overrides (HTML uses these)
══════════════════════════════════════════════════════════════ */
// Override the inline onclick="openModal(...)" for modals that need dropdown pre-population
const _origOpenModal = openModal;
window.openModal = async function(id) {
  // Pre-populate dropdowns before opening
  if (id === 'appointment-modal') {
    await populateDropdowns().catch(() => {});
  } else if (id === 'prescription-modal') {
    await populatePrescriptionDropdowns().catch(() => {});
  } else if (id === 'bill-modal') {
    await populateBillDropdowns().catch(() => {});
  } else if (id === 'doctor-modal') {
    await loadDepartmentsIntoSelect('d-dept-id').catch(() => {});
  } else if (id === 'nurse-modal') {
    await loadDepartmentsIntoSelect('n-dept-id').catch(() => {});
  } else if (id === 'medication-modal') {
    await loadSuppliersIntoSelect('m-sup-id').catch(() => {});
  }
  _origOpenModal(id);
};
