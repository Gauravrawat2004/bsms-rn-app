
/**
 * Bus Management System — Backend (Express + Supabase)
 * ---------------------------------------------------
 * One-day ticket passengers + permanent student adding by Conductor.
 * Data sources:
 *  - data/buses.json           (persisted buses)
 *  - data/students.json        (persisted permanent students)
 *  - data/temp_tickets.json    (ephemeral tickets, only for today)
 */

require('dotenv').config();

const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

/* ------------------------------ Supabase ------------------------------ */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

if (!supabase) {
  console.warn(
    'Supabase client NOT initialised. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to enable DB sync.'
  );
}

/* ------------------------------- Middlewares ------------------------------- */

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json());

/* ------------------------------- Storage init ------------------------------ */

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
}

const BUSES_FILE = path.join(DATA_DIR, 'buses.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const TICKETS_FILE = path.join(DATA_DIR, 'temp_tickets.json');

for (const file of [BUSES_FILE, STUDENTS_FILE, TICKETS_FILE]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
}

const upload = multer({ dest: UPLOAD_DIR });

/* ------------------------------- Utilities ------------------------------- */

const toNull = (v) => {
  const s = String(v || '').trim();
  if (!s || s === '---') return null;
  return s;
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function safeUnlink(fp) {
  try { fs.unlinkSync(fp); } catch {}
}

function normalizeString(v) {
  return String(v || '').trim();
}

function normalizeRoute(v) {
  return normalizeString(v).toLowerCase();
}

function todayISO() {
  // Use local date (no time part) so "one day" works by calendar date
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function purgeOldTickets() {
  const all = readJson(TICKETS_FILE);
  const today = todayISO();
  const todays = all.filter((t) => t.date === today);
  if (todays.length !== all.length) {
    writeJson(TICKETS_FILE, todays);
  }
  return todays;
}

function findBusByRoute(buses, routeRaw) {
  const routeKey = normalizeRoute(routeRaw);
  return buses.find((b) => normalizeRoute(b.route) === routeKey) || null;
}

function getIpForConsole() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

/**
 * Find next available seat on a bus for today, respecting capacity.
 * Considers permanent students + today's tickets.
 */
function nextAvailableSeat(buses, students, tickets, busNo) {
  const bus = buses.find((b) => b.bus_no === busNo);
  if (!bus) return null;
  const capacity = bus.capacity || 36;

  const taken = new Set();
  students.filter((s) => s.bus_no === busNo && s.seat).forEach((s) => taken.add(Number(s.seat)));
  tickets.filter((t) => t.bus_no === busNo && t.seat).forEach((t) => taken.add(Number(t.seat)));

  for (let seat = 1; seat <= capacity; seat++) {
    if (!taken.has(seat)) return seat;
  }
  return null; // full
}

/* ------------------------------- Health -------------------------------- */

app.get('/', (req, res) => {
  res.send(`
## BACKEND LIVE!
CSV upload + Students + Tickets (one-day).

New endpoints:
- POST /api/conductor/ticket        { conductor_id, name, student_id? } -> add one-day passenger
- DELETE /api/conductor/ticket/:id  -> remove today's ticket
- GET  /api/conductor/tickets?bus_no=1 -> list today's tickets for a bus
- POST /api/conductor/add-student   { conductor_id, student_id, name } -> add permanent student
`);
});

/* ---------------------------- Upload: Buses ---------------------------- */

app.post('/api/mto/upload-buses', upload.single('csv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field must be "csv")' });

  const buses = [];

  fs.createReadStream(req.file.path)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', (row) => {
      const bus_no = parseInt(normalizeString(row.bus_no), 10);
      const vehicle_no = normalizeString(row.vehicle_no);
      const driver = normalizeString(row.driver);
      const driver_contact = toNull(row.driver_contact);
      const helper = toNull(row.helper);
      const helper_contact = toNull(row.helper_contact);
      const route = normalizeString(row.route);
      const time = normalizeString(row.time);
      const capacity = parseInt(normalizeString(row.capacity), 10);
      const conductor_id = normalizeString(row.conductor_id);

      if (!Number.isInteger(bus_no) || !route) return;

      buses.push({
        bus_no,
        vehicle_no,
        driver,
        driver_contact,
        helper,
        helper_contact,
        route,
        time,
        capacity: Number.isInteger(capacity) ? capacity : 36,
        conductor_id: conductor_id || null,
      });
    })
    .on('end', async () => {
      try {
        writeJson(BUSES_FILE, buses);

        if (supabase && buses.length) {
          const { error } = await supabase.from('buses').upsert(buses, { onConflict: 'bus_no' });
          if (error) console.error('Supabase buses upsert error:', error);
          else console.log('BUSES SYNCED TO SUPABASE:', buses.length);
        }

        safeUnlink(req.file.path);
        res.json({ message: 'BUSES UPLOADED!', count: buses.length });
      } catch (err) {
        console.error('Error processing buses CSV:', err);
        res.status(500).json({ error: 'Failed to process buses CSV' });
      }
    })
    .on('error', (err) => {
      console.error('CSV parse error (buses):', err);
      res.status(500).json({ error: 'CSV parse error' });
    });
});

/* --------------------------- Upload: Students --------------------------- */

app.post('/api/mto/upload-students', upload.single('csv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field must be "csv")' });

  const buses = readJson(BUSES_FILE);
  const students = [];
  const seatsByBus = new Map(buses.map((b) => [b.bus_no, 0]));

  fs.createReadStream(req.file.path)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', (row) => {
      const fee_paid = normalizeString(row.fee_paid).toLowerCase();
      if (fee_paid !== 'yes') return;

      const student_id = normalizeString(row.student_id);
      const name = normalizeString(row.name);
      const course = normalizeString(row.course);
      const year = parseInt(normalizeString(row.year), 10);
      const route = normalizeString(row.route);
      if (!student_id || !name || !route) return;

      const bus = findBusByRoute(buses, route);
      if (!bus) return;

      const currentSeats = seatsByBus.get(bus.bus_no) || 0;
      const capacity = bus.capacity || 36;
      if (currentSeats >= capacity) return;

      const seat = currentSeats + 1;
      seatsByBus.set(bus.bus_no, seat);

      students.push({
        student_id,
        name,
        course: course || null,
        year: Number.isInteger(year) ? year : null,
        bus_no: bus.bus_no,
        seat,
        present: false,
        fee_paid: true,
      });
    })
    .on('end', async () => {
      try {
        writeJson(STUDENTS_FILE, students);

        if (supabase && students.length) {
          const { error } = await supabase
            .from('students')
            .upsert(students, { onConflict: 'student_id' });
          if (error) console.error('Supabase students upsert error:', error);
          else console.log('STUDENTS SYNCED TO SUPABASE:', students.length);
        }

        safeUnlink(req.file.path);
        res.json({ message: 'STUDENTS UPLOADED!', added: students.length });
      } catch (err) {
        console.error('Error processing students CSV:', err);
        res.status(500).json({ error: 'Failed to process students CSV' });
      }
    })
    .on('error', (err) => {
      console.error('CSV parse error (students):', err);
      res.status(500).json({ error: 'CSV parse error' });
    });
});

/* ----------------------------- Core GET APIs ----------------------------- */

// All buses
app.get('/api/buses', async (req, res) => {
  res.json(readJson(BUSES_FILE));
});

// Students (permanent + today's tickets). Optional filter: bus_no
app.get('/api/students', async (req, res) => {
  const busNoQ = req.query.bus_no ? parseInt(String(req.query.bus_no), 10) : null;
  const students = readJson(STUDENTS_FILE);
  const ticketsToday = purgeOldTickets();

  const merged = [
    ...students.map((s) => ({ ...s, is_temp: false })),
    ...ticketsToday.map((t) => ({
      student_id: t.student_id,
      name: t.name,
      bus_no: t.bus_no,
      seat: t.seat,
      present: !!t.present,
      fee_paid: false,
      route: null,
      is_temp: true,
    })),
  ];

  if (busNoQ) return res.json(merged.filter((s) => s.bus_no === busNoQ));
  res.json(merged);
});

// Student by ID (checks permanent first, then today's tickets)
app.get('/api/student/:id', async (req, res) => {
  const id = normalizeString(req.params.id);
  const students = readJson(STUDENTS_FILE);
  const ticketsToday = purgeOldTickets();

  let student =
    students.find((s) => s.student_id === id) ||
    ticketsToday.find((t) => t.student_id === id);

  if (!student && supabase) {
    const { data } = await supabase.from('students').select('*').eq('student_id', id).maybeSingle();
    if (data) student = data;
    else {
      const { data: temp } = await supabase
        .from('temp_tickets')
        .select('*')
        .eq('student_id', id)
        .eq('date', todayISO())
        .maybeSingle();
      if (temp) student = temp;
    }
  }

  if (!student) return res.status(404).json({ error: 'Student not found' });

  // Return unified shape
  if ('id' in student || 'name' in student) {
    return res.json({
      student_id: student.student_id,
      name: student.name,
      bus_no: student.bus_no ?? null,
      seat: student.seat ?? null,
      present: !!student.present,
      fee_paid: !!student.fee_paid,
      route: student.route ?? null,
      is_temp: !!student.is_temp || !!student.ticket,
    });
  }
  res.json(student);
});

/* ---------------------------- Conductor APIs ---------------------------- */

// Resolve conductor → bus_no (prefer buses with conductor_id)
app.get('/api/conductor/:id', async (req, res) => {
  const id = normalizeString(req.params.id);
  const buses = readJson(BUSES_FILE);

  const match = buses.find((b) => normalizeString(b.conductor_id) === id);
  if (match) return res.json({ bus_no: match.bus_no });

  const fallback = { C001: 1, C004: 4, C011: 11 };
  if (fallback[id]) return res.json({ bus_no: fallback[id] });

  res.status(404).json({ error: 'Conductor not assigned to any bus' });
});

// Conductor marks attendance (permanent or today's ticket)
app.post('/api/conductor/attendance', async (req, res) => {
  const { student_id, present, conductor_id } = req.body || {};
  const id = normalizeString(student_id);
  const cid = normalizeString(conductor_id || '');
  const val = Boolean(present);

  const buses = readJson(BUSES_FILE);
  const busOfConductor = cid
    ? buses.find((b) => normalizeString(b.conductor_id) === cid)
    : null;

  const students = readJson(STUDENTS_FILE);
  const idx = students.findIndex((s) => s.student_id === id);
  if (idx >= 0) {
    // Optional: restrict to conductor’s bus
    if (busOfConductor && students[idx].bus_no !== busOfConductor.bus_no) {
      return res.status(403).json({ error: 'Conductor can only mark attendance for their bus' });
    }
    students[idx].present = val;
    writeJson(STUDENTS_FILE, students);
    if (supabase) await supabase.from('students').update({ present: val }).eq('student_id', id);
    return res.json({ message: 'Attendance updated', student_id: id, present: val });
  }

  // Try today's ticket
  const ticketsToday = purgeOldTickets();
  const tIdx = ticketsToday.findIndex((t) => t.student_id === id);
  if (tIdx < 0) return res.status(404).json({ error: 'Passenger not found' });

  if (busOfConductor && ticketsToday[tIdx].bus_no !== busOfConductor.bus_no) {
    return res.status(403).json({ error: 'Conductor can only mark attendance for their bus' });
  }

  ticketsToday[tIdx].present = val;
  writeJson(TICKETS_FILE, ticketsToday);

  if (supabase) {
    await supabase
      .from('temp_tickets')
      .update({ present: val })
      .eq('student_id', id)
      .eq('date', todayISO());
  }

  res.json({ message: 'Attendance updated (ticket)', student_id: id, present: val });
});

// Add today's ticket passenger (one-day)
app.post('/api/conductor/ticket', async (req, res) => {
  const { conductor_id, name, student_id } = req.body || {};
  const cid = normalizeString(conductor_id);
  const passengerName = normalizeString(name);

  if (!cid || !passengerName) {
    return res.status(400).json({ error: 'Missing conductor_id or name' });
  }

  const buses = readJson(BUSES_FILE);
  const bus = buses.find((b) => normalizeString(b.conductor_id) === cid);
  if (!bus) return res.status(403).json({ error: 'Conductor is not assigned to any bus' });

  // Load data
  const students = readJson(STUDENTS_FILE);
  const ticketsToday = purgeOldTickets();

  // Seat availability
  const seat = nextAvailableSeat(buses, students, ticketsToday, bus.bus_no);
  if (!seat) return res.status(400).json({ error: 'Bus capacity full for today' });

  // Generate id if not provided
  const date = todayISO();
  const tempId =
    normalizeString(student_id) ||
    `TEMP-${bus.bus_no}-${date.replace(/-/g, '')}-${String(Date.now()).slice(-5)}`;

  const ticket = {
    id: tempId, // internal id
    student_id: tempId, // for unified handling
    name: passengerName,
    bus_no: bus.bus_no,
    seat,
    date, // YYYY-MM-DD
    present: false,
  };

  ticketsToday.push(ticket);
  writeJson(TICKETS_FILE, ticketsToday);

  if (supabase) {
    await supabase.from('temp_tickets').upsert(
      {
        id: tempId,
        student_id: tempId,
        name: passengerName,
        bus_no: bus.bus_no,
        seat,
        date,
        present: false,
      },
      { onConflict: 'id' }
    );
  }

  res.json({ message: 'Ticket passenger added for today', ticket });
});

// Remove a ticket passenger (today only)
app.delete('/api/conductor/ticket/:id', async (req, res) => {
  const id = normalizeString(req.params.id);
  const ticketsToday = purgeOldTickets();
  const newList = ticketsToday.filter((t) => t.student_id !== id);

  if (newList.length === ticketsToday.length) {
    return res.status(404).json({ error: 'Ticket not found for today' });
  }

  writeJson(TICKETS_FILE, newList);
  if (supabase) {
    await supabase.from('temp_tickets').delete().eq('student_id', id).eq('date', todayISO());
  }

  res.json({ message: 'Ticket removed' });
});

// List today's tickets (optionally filtered by bus_no)
app.get('/api/conductor/tickets', async (req, res) => {
  const busNoQ = req.query.bus_no ? parseInt(String(req.query.bus_no), 10) : null;
  const ticketsToday = purgeOldTickets();
  if (busNoQ) return res.json(ticketsToday.filter((t) => t.bus_no === busNoQ));
  res.json(ticketsToday);
});

// Add permanent student (auto-seat) by conductor
app.post('/api/conductor/add-student', async (req, res) => {
  const { conductor_id, student_id, name } = req.body || {};
  const cid = normalizeString(conductor_id);
  const id = normalizeString(student_id);
  const nm = normalizeString(name);

  if (!cid || !id || !nm) {
    return res.status(400).json({ error: 'Missing conductor_id, student_id, or name' });
  }

  const buses = readJson(BUSES_FILE);
  const bus = buses.find((b) => normalizeString(b.conductor_id) === cid);
  if (!bus) return res.status(403).json({ error: 'Conductor is not assigned to any bus' });

  const students = readJson(STUDENTS_FILE);
  if (students.some((s) => s.student_id === id)) {
    return res.status(409).json({ error: 'Student ID already exists' });
  }

  const ticketsToday = purgeOldTickets();
  const seat = nextAvailableSeat(buses, students, ticketsToday, bus.bus_no);
  if (!seat) return res.status(400).json({ error: 'Bus capacity full' });

  const newStudent = {
    student_id: id,
    name: nm,
    course: null,
    year: null,
    bus_no: bus.bus_no,
    seat,
    present: false,
    fee_paid: false,
  };

  students.push(newStudent);
  writeJson(STUDENTS_FILE, students);

  if (supabase) {
    await supabase.from('students').upsert(newStudent, { onConflict: 'student_id' });
  }

  res.json({ message: 'Student added', student: newStudent });
});

/* ------------------------------ MTO APIs ------------------------------ */

app.post('/api/mto/assign', async (req, res) => {
  const { mto_id, student_id, bus_no } = req.body || {};
  const id = normalizeString(student_id);
  const busNo = Number(bus_no);
  if (!id || !Number.isInteger(busNo)) {
    return res.status(400).json({ error: 'Invalid student_id or bus_no' });
  }

  const buses = readJson(BUSES_FILE);
  const students = readJson(STUDENTS_FILE);
  const ticketsToday = purgeOldTickets();

  const bus = buses.find((b) => b.bus_no === busNo);
  if (!bus) return res.status(404).json({ error: 'Bus not found' });

  const seat = nextAvailableSeat(buses, students, ticketsToday, busNo);
  if (!seat) return res.status(400).json({ error: 'Bus capacity full' });

  const idx = students.findIndex((s) => s.student_id === id);
  if (idx < 0) return res.status(404).json({ error: 'Student not found' });

  students[idx].bus_no = busNo;
  students[idx].seat = seat;

  writeJson(STUDENTS_FILE, students);

  if (supabase) {
    await supabase.from('students').update({ bus_no: busNo, seat }).eq('student_id', id);
  }

  res.json({ message: 'Student assigned', mto_id: mto_id || 'MTO', student_id: id, bus_no: busNo, seat });
});

app.post('/api/mto/conductor', async (req, res) => {
  const { bus_no, conductor_id } = req.body || {};
  const busNo = Number(bus_no);
  const cid = normalizeString(conductor_id);
  if (!Number.isInteger(busNo) || !cid) {
    return res.status(400).json({ error: 'Invalid bus_no or conductor_id' });
  }

  const buses = readJson(BUSES_FILE);
  const idx = buses.findIndex((b) => b.bus_no === busNo);
  if (idx < 0) return res.status(404).json({ error: 'Bus not found' });

  buses[idx].conductor_id = cid;
  writeJson(BUSES_FILE, buses);

  if (supabase) {
    await supabase.from('buses').update({ conductor_id: cid }).eq('bus_no', busNo);
  }

  res.json({ message: 'Conductor reassigned', bus_no: busNo, conductor_id: cid });
});

/* --------------------------- Incharge APIs --------------------------- */

app.get('/api/incharge/summary', async (req, res) => {
  const buses = readJson(BUSES_FILE);
  const students = readJson(STUDENTS_FILE);
  const ticketsToday = purgeOldTickets();

  const summary = buses.map((b) => {
    const permanent = students.filter((s) => s.bus_no === b.bus_no);
    const temp = ticketsToday.filter((t) => t.bus_no === b.bus_no);
    const assigned = permanent.length + temp.length;
    const present_today = permanent.filter((s) => s.present).length + temp.filter((t) => t.present).length;

    return {
      bus_no: b.bus_no,
      capacity: b.capacity || 36,
      occupied: assigned,
      present_today,
      route: b.route || null,
    };
  });

  res.json(summary);
});

app.post('/api/incharge/alert', async (req, res) => {
  const { incharge_id, message } = req.body || {};
  console.log('INCHARGE ALERT:', { incharge_id, message });
  res.json({ ok: true, message: 'Alert broadcasted (logged on server)' });
});

/* ------------------------------- Start ------------------------------- */

const ip = getIpForConsole();
app.listen(PORT, '0.0.0.0', () => {
  console.log('────────────────────────────────────');
  console.log('SERVER LIVE!');
  console.log(`Open on PC   → http://localhost:${PORT}`);
  console.log(`Open on Phone→ http://${ip}:${PORT}`);
  console.log('────────────────────────────────────');
});
