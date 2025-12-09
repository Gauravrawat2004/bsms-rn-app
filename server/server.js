
/**
 * BSMS Backend — Supabase + CSV Upload (File or JSON)
 * Dec 2025
 */
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

// NEW: file upload + csv parsing
const multer = require('multer');
const { parse: parseCsvSync } = require('csv-parse/sync');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

/* -------------------------- Supabase -------------------------- */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase) {
  console.warn('Supabase not connected. Set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY');
}

/* -------------------------- Middlewares -------------------------- */
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));
// NOTE: Multer handles multipart/form-data; no need for urlencoded here

/* -------------------------- Storage -------------------------- */
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const BUSES_FILE = path.join(DATA_DIR, 'buses.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const TICKETS_FILE = path.join(DATA_DIR, 'temp_tickets.json');
[BUSES_FILE, STUDENTS_FILE, TICKETS_FILE].forEach(file => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
});

/* -------------------------- Helpers -------------------------- */
const toNull = (v) => {
  const s = String(v ?? '').trim();
  return (!s || s === '---' || s === 'null' || s === 'NULL') ? null : s;
};
const normalizeString = (v) => String(v ?? '').trim();
const normalizeRoute = (v) => normalizeString(v).toLowerCase();

function readJson(file) {
  try {
    const data = fs.readFileSync(file, 'utf-8').trim();
    return data === '' ? [] : JSON.parse(data);
  } catch (err) {
    return [];
  }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function todayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}
function purgeOldTickets() {
  const all = readJson(TICKETS_FILE);
  const today = todayISO();
  const todays = all.filter(t => t.date === today);
  if (todays.length !== all.length) {
    writeJson(TICKETS_FILE, todays);
  }
  return todays;
}
function findBusByRoute(buses, routeRaw) {
  const key = normalizeRoute(routeRaw);
  return buses.find(b => normalizeRoute(b.route) === key) ?? null;
}
function nextAvailableSeat(buses, students, tickets, busNo) {
  const bus = buses.find(b => b.bus_no === busNo);
  if (!bus) return null;
  const capacity = bus.capacity ?? 36;
  const taken = new Set();
  students.filter(s => s.bus_no === busNo && s.seat).forEach(s => taken.add(Number(s.seat)));
  tickets.filter(t => t.bus_no === busNo && t.seat).forEach(t => taken.add(Number(t.seat)));
  for (let i = 1; i <= capacity; i++) {
    if (!taken.has(i)) return i;
  }
  return null;
}
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

/* -------------------------- Multer setup -------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/* -------------------------- CSV parsing -------------------------- */
function parseCsvBufferToRows(buffer) {
  const text = buffer.toString('utf-8');
  // columns:true -> returns objects keyed by header names; handles quoted fields; skip empty lines
  return parseCsvSync(text, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

/* -------------------------- Mappers -------------------------- */
function mapBusRow(row) {
  return {
    bus_no: parseInt(row.bus_no ?? row['Bus No'] ?? row.busNo ?? row.Bus_No, 10),
    vehicle_no: toNull(row.vehicle_no ?? row['Vehicle No'] ?? row.Vehicle_No),
    driver: toNull(row.driver ?? row.Driver),
    driver_contact: toNull(row.driver_contact ?? row['Driver Contact']),
    helper: toNull(row.helper ?? row.Helper),
    helper_contact: toNull(row.helper_contact ?? row['Helper Contact']),
    route: normalizeString(row.route ?? row.Route),
    time: toNull(row.time ?? row.Time),
    capacity: parseInt(row.capacity ?? row.Capacity ?? 36, 10) || 36,
    conductor_id: toNull(row.conductor_id ?? row['Conductor ID'] ?? row.Conductor_ID),
  };
}
function mapStudentRow(row, buses, existingById, seatsByBus) {
  const feeRaw = String(row.fee_paid ?? row['Fee Paid'] ?? row.Fee_Paid ?? '').trim().toLowerCase();
  const feePaid = ['yes', 'true', '1'].includes(feeRaw);

  const student_id = normalizeString(row.student_id ?? row['Student ID'] ?? row.Student_ID);
  const name = normalizeString(row.name ?? row.Name);
  const route = normalizeString(row.route ?? row.Route);

  if (!feePaid || !student_id || !name || !route) return null;
  if (existingById.has(student_id)) return null;

  const bus = findBusByRoute(buses, route);
  if (!bus) return null;

  const current = seatsByBus.get(bus.bus_no) ?? 0;
  if (current >= (bus.capacity ?? 36)) return null;

  const seat = current + 1;
  seatsByBus.set(bus.bus_no, seat);

  return {
    student_id,
    name,
    course: toNull(row.course ?? row.Course),
    year: parseInt(row.year ?? row.Year, 10) || null,
    bus_no: bus.bus_no,
    seat,
    present: false,
    fee_paid: true,
  };
}

/* ============================== NEW FILE UPLOAD ENDPOINTS ============================== */
/**
 * RN mto.tsx calls:
 *  - POST /upload/bus      (multipart/form-data, field: file)
 *  - POST /upload/student  (multipart/form-data, field: file)
 * This keeps your previous JSON endpoints too.
 */

// -------- BUS (file) --------
app.post('/upload/bus', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No bus CSV file received' });

    const rows = parseCsvBufferToRows(req.file.buffer);
    const buses = rows.map(mapBusRow).filter(b => Number.isInteger(b.bus_no) && b.route);

    // Persist locally
    writeJson(BUSES_FILE, buses);

    // Supabase upsert
    if (supabase && buses.length > 0) {
      const { error } = await supabase.from('buses').upsert(buses, { onConflict: 'bus_no' });
      if (error) {
        console.error('Supabase buses error:', error);
        // Non-fatal: still report success for local write
      }
    }
    return res.json({ message: 'Buses uploaded successfully!', count: buses.length });
  } catch (err) {
    console.error('BUS upload error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// -------- STUDENT (file) --------
app.post('/upload/student', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No student CSV file received' });

    const buses = readJson(BUSES_FILE);
    const existing = readJson(STUDENTS_FILE);

    const seatsByBus = new Map();
    existing.forEach(s => {
      if (s.bus_no && s.seat) {
        seatsByBus.set(s.bus_no, Math.max(seatsByBus.get(s.bus_no) ?? 0, s.seat));
      }
    });
    const existingById = new Map(existing.map(s => [s.student_id, true]));

    const rows = parseCsvBufferToRows(req.file.buffer);
    const newStudents = [];
    for (const row of rows) {
      const mapped = mapStudentRow(row, buses, existingById, seatsByBus);
      if (mapped) newStudents.push(mapped);
    }

    const allStudents = [...existing, ...newStudents];
    writeJson(STUDENTS_FILE, allStudents);

    if (supabase && newStudents.length > 0) {
      const { error } = await supabase.from('students').upsert(newStudents, { onConflict: 'student_id' });
      if (error) {
        console.error('Supabase students error:', error);
      }
    }
    return res.json({ message: 'Students uploaded!', added: newStudents.length });
  } catch (err) {
    console.error('STUDENT upload error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* ============================== JSON (existing) ENDPOINTS ============================== */
// Kept from your original version (accepts { data: [...] }) — no change needed.
app.post('/api/mto/upload-buses', async (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: 'Expected { data: [...] }' });
  }
  const buses = data.map(mapBusRow).filter(b => Number.isInteger(b.bus_no) && b.route);
  try {
    writeJson(BUSES_FILE, buses);
    if (supabase && buses.length > 0) {
      const { error } = await supabase.from('buses').upsert(buses, { onConflict: 'bus_no' });
      if (error) console.error('Supabase buses error:', error);
    }
    res.json({ message: 'Buses uploaded successfully!', count: buses.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/mto/upload-students', async (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: 'Expected { data: [...] }' });
  }
  const buses = readJson(BUSES_FILE);
  const existing = readJson(STUDENTS_FILE);
  const seatsByBus = new Map();
  existing.forEach(s => {
    if (s.bus_no && s.seat) {
      seatsByBus.set(s.bus_no, Math.max(seatsByBus.get(s.bus_no) ?? 0, s.seat));
    }
  });
  const existingById = new Map(existing.map(s => [s.student_id, true]));
  const newStudents = [];
  for (const row of data) {
    const mapped = mapStudentRow(row, buses, existingById, seatsByBus);
    if (mapped) newStudents.push(mapped);
  }
  const allStudents = [...existing, ...newStudents];
  writeJson(STUDENTS_FILE, allStudents);
  if (supabase && newStudents.length > 0) {
    const { error } = await supabase.from('students').upsert(newStudents, { onConflict: 'student_id' });
    if (error) console.error('Supabase students error:', error);
  }
  res.json({ message: 'Students uploaded!', added: newStudents.length });
});

/* ============================== Other endpoints (unchanged) ============================== */
app.get('/', (req, res) => {
  res.send('<h2>BSMS Backend LIVE!</h2><p>CSV Upload Working</p>');
});
app.get('/api/buses', (req, res) => res.json(readJson(BUSES_FILE)));
app.get('/api/students', (req, res) => {
  const busNo = req.query.bus_no ? parseInt(req.query.bus_no, 10) : null;
  const students = readJson(STUDENTS_FILE);
  const tickets = purgeOldTickets();
  const merged = [
    ...students.map(s => ({ ...s, is_temp: false })),
    ...tickets.map(t => ({ student_id: t.student_id, name: t.name, bus_no: t.bus_no, seat: t.seat, present: !!t.present, fee_paid: false, is_temp: true }))
  ];
  res.json(busNo ? merged.filter(s => s.bus_no === busNo) : merged);
});
app.get('/api/student/:id', (req, res) => {
  const id = normalizeString(req.params.id);
  const students = readJson(STUDENTS_FILE);
  const tickets = purgeOldTickets();
  const found = students.find(s => s.student_id === id) ?? tickets.find(t => t.student_id === id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  res.json(found);
});
app.get('/api/conductor/:id', (req, res) => {
  const id = normalizeString(req.params.id);
  const buses = readJson(BUSES_FILE);
  const match = buses.find(b => normalizeString(b.conductor_id) === id);
  if (match) return res.json({ bus_no: match.bus_no });
  const fallback = { C001: 1, C004: 4, C011: 11 };
  if (fallback[id]) return res.json({ bus_no: fallback[id] });
  res.status(404).json({ error: 'Not assigned' });
});
app.post('/api/conductor/attendance', (req, res) => {
  const { student_id, present } = req.body ?? {};
  const id = normalizeString(student_id);
  const val = Boolean(present);
  const students = readJson(STUDENTS_FILE);
  const idx = students.findIndex(s => s.student_id === id);
  if (idx >= 0) {
    students[idx].present = val;
    writeJson(STUDENTS_FILE, students);
    if (supabase) supabase.from('students').update({ present: val }).eq('student_id', id);
    return res.json({ message: 'Attendance updated', present: val });
  }
  const tickets = purgeOldTickets();
  const tIdx = tickets.findIndex(t => t.student_id === id);
  if (tIdx < 0) return res.status(404).json({ error: 'Not found' });
  tickets[tIdx].present = val;
  writeJson(TICKETS_FILE, tickets);
  res.json({ message: 'Attendance updated (ticket)', present: val });
});
app.post('/api/conductor/ticket', (req, res) => {
  const { conductor_id, name, student_id } = req.body ?? {};
  const cid = normalizeString(conductor_id);
  const passengerName = normalizeString(name);
  if (!cid || !passengerName) return res.status(400).json({ error: 'Missing data' });
  const buses = readJson(BUSES_FILE);
  const bus = buses.find(b => normalizeString(b.conductor_id) === cid);
  if (!bus) return res.status(403).json({ error: 'Conductor not assigned' });
  const students = readJson(STUDENTS_FILE);
  const tickets = purgeOldTickets();
  const seat = nextAvailableSeat(buses, students, tickets, bus.bus_no);
  if (!seat) return res.status(400).json({ error: 'Bus full' });
  const tempId = normalizeString(student_id) || `TEMP-${Date.now()}`;
  const ticket = { id: tempId, student_id: tempId, name: passengerName, bus_no: bus.bus_no, seat, date: todayISO(), present: false };
  tickets.push(ticket);
  writeJson(TICKETS_FILE, tickets);
  res.json({ message: 'Ticket added', ticket });
});
app.delete('/api/conductor/ticket/:id', (req, res) => {
  const id = normalizeString(req.params.id);
  const tickets = purgeOldTickets();
  const filtered = tickets.filter(t => t.student_id !== id);
  if (filtered.length === tickets.length) return res.status(404).json({ error: 'Not found' });
  writeJson(TICKETS_FILE, filtered);
  res.json({ message: 'Ticket removed' });
});
app.get('/api/conductor/tickets', (req, res) => {
  const busNo = req.query.bus_no ? parseInt(req.query.bus_no, 10) : null;
  const tickets = purgeOldTickets();
  res.json(busNo ? tickets.filter(t => t.bus_no === busNo) : tickets);
});
app.post('/api/conductor/add-student', (req, res) => {
  const { conductor_id, student_id, name } = req.body ?? {};
  const cid = normalizeString(conductor_id);
  const id = normalizeString(student_id);
  const nm = normalizeString(name);
  if (!cid || !id || !nm) return res.status(400).json({ error: 'Missing data' });
  const buses = readJson(BUSES_FILE);
  const bus = buses.find(b => normalizeString(b.conductor_id) === cid);
  if (!bus) return res.status(403).json({ error: 'Not assigned' });
  const students = readJson(STUDENTS_FILE);
  if (students.some(s => s.student_id === id)) return res.status(409).json({ error: 'Already exists' });
  const tickets = purgeOldTickets();
  const seat = nextAvailableSeat(buses, students, tickets, bus.bus_no);
  if (!seat) return res.status(400).json({ error: 'Bus full' });
  const newStd = { student_id: id, name: nm, bus_no: bus.bus_no, seat, present: false, fee_paid: false };
  students.push(newStd);
  writeJson(STUDENTS_FILE, students);
  res.json({ message: 'Student added', student: newStd });
});
app.post('/api/mto/assign', (req, res) => {
  const { student_id, bus_no } = req.body ?? {};
  const id = normalizeString(student_id);
  const busNo = Number(bus_no);
  if (!id || !Number.isInteger(busNo)) return res.status(400).json({ error: 'Invalid data' });
  const buses = readJson(BUSES_FILE);
  const bus = buses.find(b => b.bus_no === busNo);
  if (!bus) return res.status(404).json({ error: 'Bus not found' });
  const students = readJson(STUDENTS_FILE);
  const idx = students.findIndex(s => s.student_id === id);
  if (idx < 0) return res.status(404).json({ error: 'Student not found' });
  const tickets = purgeOldTickets();
  const seat = nextAvailableSeat(buses, students, tickets, busNo);
  if (!seat) return res.status(400).json({ error: 'Bus full' });
  students[idx].bus_no = busNo;
  students[idx].seat = seat;
  writeJson(STUDENTS_FILE, students);
  res.json({ message: 'Assigned', seat });
});
app.post('/api/mto/conductor', (req, res) => {
  const { bus_no, conductor_id } = req.body ?? {};
  const busNo = Number(bus_no);
  const cid = normalizeString(conductor_id);
  if (!Number.isInteger(busNo) || !cid) return res.status(400).json({ error: 'Invalid data' });
  const buses = readJson(BUSES_FILE);
  const idx = buses.findIndex(b => b.bus_no === busNo);
  if (idx < 0) return res.status(404).json({ error: 'Bus not found' });
  buses[idx].conductor_id = cid;
  writeJson(BUSES_FILE, buses);
  res.json({ message: 'Conductor updated' });
});
app.get('/api/incharge/summary', (req, res) => {
  const buses = readJson(BUSES_FILE);
  const students = readJson(STUDENTS_FILE);
  const tickets = purgeOldTickets();
  const summary = buses.map(b => {
    const perm = students.filter(s => s.bus_no === b.bus_no).length;
    const temp = tickets.filter(t => t.bus_no === b.bus_no).length;
    const present = students.filter(s => s.bus_no === b.bus_no && s.present).length +
                    tickets.filter(t => t.bus_no === b.bus_no && t.present).length;
    return { bus_no: b.bus_no, capacity: b.capacity ?? 36, occupied: perm + temp, present_today: present, route: b.route };
  });
  res.json(summary);
});
app.post('/api/incharge/alert', (req, res) => {
  console.log('INCHARGE ALERT:', req.body);
  res.json({ ok: true });
});

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

/* -------------------------- Start Server -------------------------- */
const ip = getLocalIp();
app.listen(PORT, '0.0.0.0', () => {
  console.log('─────────────────────────────────────────────');
  console.log(' BSMS SERVER LIVE & READY!');
  console.log(` Local → http://localhost:${PORT}`);
  console.log(` Phone → http://${ip}:${PORT}`);
  console.log(' CSV Upload → Working with file and JSON');
  console.log('─────────────────────────────────────────────');
});
