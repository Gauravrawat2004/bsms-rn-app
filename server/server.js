/**
 * BSMS Backend — Updated Feb 2026
 * Fixed: ngrok headers, multipart handling, and safe JSON parsing
 * Place at: X:\bsms-rn-app\server\server.js
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const { parse: parseCsvSync } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

/* ───────────────────────────── Supabase ───────────────────────────── */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

if (!supabase) {
    console.warn('⚠️ Supabase not connected. Check your .env file.');
}

/* ───────────────────────────── Middlewares ───────────────────────────── */
/* ───────────────────────────── Middlewares ───────────────────────────── */
const corsOptions = {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials:true 
  };

app.use(cors(corsOptions));
// parse application/json bodies so req.body is populated
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  res.header('ngrok-skip-browser-warning', 'true');
  next();
});

/* ───────────────────────────── Local storage ───────────────────────────── */
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const BUSES_FILE = path.join(DATA_DIR, 'buses.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const FACULTIES_FILE = path.join(DATA_DIR, 'faculties.json');
const CHAT_FILE = path.join(DATA_DIR, 'chat.json');

const TICKETS_FILE = path.join(DATA_DIR, 'temp_tickets.json');

[BUSES_FILE, STUDENTS_FILE, TICKETS_FILE].forEach((file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
});
// ensure faculty and chat files exist
[ FACULTIES_FILE, CHAT_FILE ].forEach((file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
});

[BUSES_FILE, STUDENTS_FILE, TICKETS_FILE].forEach((file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
});

/* ───────────────────────────── Helpers ───────────────────────────── */
const toNull = (v) => {
    const s = String(v ?? '').trim();
    return !s || s === '---' || s.toLowerCase() === 'null' ? null : s;
};

const normalizeString = (v) => String(v ?? '').trim();
const normalizeRoute = (v) => normalizeString(v).toLowerCase();

function readJson(file) {
    try {
        const data = fs.readFileSync(file, 'utf-8').trim();
        return data === '' ? [] : JSON.parse(data);
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
        return [];
    }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

function purgeOldTickets() {
    const all = readJson(TICKETS_FILE);
    const today = todayISO();
    const todays = all.filter((t) => t.date === today);
    if (todays.length !== all.length) writeJson(TICKETS_FILE, todays);
    return todays;
}

function findBusByRoute(buses, routeRaw) {
    const key = normalizeRoute(routeRaw);
    return buses.find((b) => normalizeRoute(b.route) === key) ?? null;
}

function nextAvailableSeat(buses, students, tickets, busNo) {
    const bus = buses.find((b) => b.bus_no === busNo);
    if (!bus) return null;
    const capacity = bus.capacity ?? 36;
    const taken = new Set();
    students.filter((s) => s.bus_no === busNo && s.seat).forEach((s) => taken.add(Number(s.seat)));
    tickets.filter((t) => t.bus_no === busNo && t.seat).forEach((t) => taken.add(Number(t.seat)));
    for (let i = 1; i <= capacity; i++) {
        if (!taken.has(i)) return i;
    }
    return null;
}

function getLocalIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return '127.0.0.1';
}

/* ───────────────────────────── Multer ───────────────────────────── */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function parseCsvBufferToRows(buffer) {
    let text = buffer.toString('utf-8');
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    console.log('CSV text sample:', text.substring(0, 200));

    try {
        // First try with headers
        const rows = parseCsvSync(text, {
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true,
        });
        console.log('Parsed with headers, sample rows:', rows.slice(0, 2));
        return rows;
    } catch (e) {
        console.log('Failed to parse with headers, trying without headers:', e.message);
        try {
            // If that fails, try without headers
            const rows = parseCsvSync(text, {
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true,
            });
            console.log('Parsed without headers, sample rows:', rows.slice(0, 2));
            return rows;
        } catch (e2) {
            console.error('Failed to parse CSV at all:', e2.message);
            return [];
        }
    }
}

/* ───────────────────────────── Mappers ───────────────────────────── */
function mapBusRow(row) {
    console.log('Mapping bus row:', row);

    let bus_no, vehicle_no, driver, driver_contact, helper, helper_contact, route, time, capacity, conductor_id, conductor_name;

    if (Array.isArray(row)) {
        // No headers - assume standard order
        [bus_no, vehicle_no, driver, driver_contact, helper, helper_contact, route, time, capacity, conductor_id, conductor_name] = row;
        console.log('Treating as array without headers');
    } else {
        // With headers
        bus_no = row.bus_no ?? row['Bus No'] ?? row.busNo ?? row.Bus_No;
        vehicle_no = row.vehicle_no ?? row['Vehicle No'] ?? row.Vehicle_No;
        driver = row.driver ?? row.Driver;
        driver_contact = row.driver_contact ?? row['Driver Contact'];
        helper = row.helper ?? row.Helper;
        helper_contact = row.helper_contact ?? row['Helper Contact'];
        route = row.route ?? row.Route;
        time = row.time ?? row.Time;
        capacity = row.capacity ?? row.Capacity;
        conductor_id = row.conductor_id ?? row['Conductor ID'] ?? row.Conductor_ID;
        conductor_name = row.conductor_name ?? row['Conductor Name'];
    }

    const mapped = {
        bus_no: parseInt(bus_no, 10),
        vehicle_no: toNull(vehicle_no),
        driver: toNull(driver),
        driver_contact: toNull(driver_contact),
        helper: toNull(helper),
        helper_contact: toNull(helper_contact),
        route: normalizeString(route),
        time: toNull(time),
        capacity: parseInt(capacity, 10) || 36,
        conductor_id: toNull(conductor_id),
        conductor_name: toNull(conductor_name),
    };
    console.log('Mapped bus:', mapped);
    return mapped;
}

function mapStudentRow(row, buses, existingById, seatsByBus) {
    const feeRaw = String(row.fee_paid ?? row['Fee Paid'] ?? row.Fee_Paid ?? '').trim().toLowerCase();
    const feePaid = ['yes', 'true', '1'].includes(feeRaw);

    const student_id = normalizeString(row.student_id ?? row['Student ID'] ?? row.Student_ID);
    const name = normalizeString(row.name ?? row.Name);
    const route = normalizeString(row.route ?? row.Route);

    if (!student_id || !name) {
        console.log(`Student missing required fields: id=${student_id}, name=${name}`);
        return null;
    }
    if (existingById.has(student_id)) {
        console.log(`Student ${student_id} already exists`);
        return null;
    }

    let bus = null;
    if (route) {
        bus = findBusByRoute(buses, route);
    }

    // If no route match, try to assign to any available bus
    if (!bus) {
        console.log(`No bus found for route "${route}", trying to assign to any available bus`);
        for (const b of buses) {
            const current = seatsByBus.get(b.bus_no) ?? 0;
            if (current < (b.capacity ?? 36)) {
                bus = b;
                break;
            }
        }
    }

    if (!bus) {
        console.log(`No available bus for student ${student_id}`);
        return null;
    }

    const current = seatsByBus.get(bus.bus_no) ?? 0;
    if (current >= (bus.capacity ?? 36)) {
        console.log(`Bus ${bus.bus_no} is full for student ${student_id}`);
        return null;
    }

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
        fee_paid: feePaid,
    };
}

/* ============================== CSV UPLOAD ENDPOINTS ============================== */

app.post('/upload/bus', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file received' });

        const rows = parseCsvBufferToRows(req.file.buffer);
        console.log(`Bus CSV: Found ${rows.length} rows`);
        if (rows.length > 0) {
            console.log(`First row sample:`, rows[0]);
        }

        const buses = rows.map(mapBusRow).filter((b) => {
            const valid = !isNaN(b.bus_no) && b.bus_no > 0;
            if (!valid) {
                console.log(`Filtered out bus:`, b);
            }
            return valid;
        });

        console.log(`Bus CSV: ${buses.length} valid buses after filtering`);

        writeJson(BUSES_FILE, buses);

        if (supabase && buses.length > 0) {
            await supabase.from('buses').upsert(buses, { onConflict: 'bus_no' });
        }

        res.json({ message: 'Buses uploaded successfully!', count: buses.length });
    } catch (err) {
        console.error('Bus Upload Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/upload/student', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file received' });

        const buses = readJson(BUSES_FILE);
        const existing = readJson(STUDENTS_FILE);
        const seatsByBus = new Map();

        existing.forEach((s) => {
            if (s.bus_no && s.seat) {
                seatsByBus.set(s.bus_no, Math.max(seatsByBus.get(s.bus_no) ?? 0, s.seat));
            }
        });

        const existingById = new Map(existing.map((s) => [s.student_id, true]));
        const rows = parseCsvBufferToRows(req.file.buffer);

        console.log(`Student CSV: Found ${rows.length} rows, ${buses.length} buses available`);
        if (rows.length > 0) {
            console.log(`First student row sample:`, rows[0]);
        }

        const newStudents = [];
        for (const row of rows) {
            const mapped = mapStudentRow(row, buses, existingById, seatsByBus);
            if (mapped) {
                newStudents.push(mapped);
            } else {
                console.log(`Filtered out student row:`, row);
            }
        }

        console.log(`Student CSV: ${newStudents.length} valid students after filtering`);

        const allStudents = [...existing, ...newStudents];
        writeJson(STUDENTS_FILE, allStudents);

        if (supabase && newStudents.length > 0) {
            await supabase.from('students').upsert(newStudents, { onConflict: 'student_id' });
        }

        res.json({ message: 'Students uploaded!', added: newStudents.length });
    } catch (err) {
        console.error('Student Upload Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.use((err, req, res, next) => {
    if (!err) return next();

    console.error('Unhandled server error:', err);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    return res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

const fetchStudent = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/student/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': '69420' 
      }
    });
    const data = await response.json();
    setStudent(data);
  } catch (err) {
    console.error("Failed to fetch student:", err);
  }
};

/* ============================== MTO/STAFF ENDPOINTS ============================== */

// Update driver for a bus
app.post('/api/mto/driver', (req, res) => {
    try {
        const { bus_no, driver_name, driver_contact } = req.body;
        if (!bus_no || !driver_name) {
            return res.status(400).json({ error: 'Missing bus_no or driver_name' });
        }

        const buses = readJson(BUSES_FILE);
        const busIndex = buses.findIndex((b) => b.bus_no === bus_no);

        if (busIndex === -1) {
            return res.status(404).json({ error: 'Bus not found' });
        }

        buses[busIndex].driver = driver_name;
        if (driver_contact) buses[busIndex].driver_contact = driver_contact;

        writeJson(BUSES_FILE, buses);

        if (supabase) {
            supabase.from('buses').update({
                driver: driver_name,
                driver_contact: driver_contact || null
            }).eq('bus_no', bus_no).then().catch(err => console.error('Supabase error:', err));
        }

        res.json({ message: 'Driver updated', bus_no, driver_name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update conductor for a bus
app.post('/api/mto/conductor', (req, res) => {
    try {
        const { bus_no, conductor_id, conductor_name } = req.body;
        if (!bus_no || !conductor_id) {
            return res.status(400).json({ error: 'Missing bus_no or conductor_id' });
        }

        const buses = readJson(BUSES_FILE);
        const busIndex = buses.findIndex((b) => b.bus_no === bus_no);

        if (busIndex === -1) {
            return res.status(404).json({ error: 'Bus not found' });
        }

        buses[busIndex].conductor_id = conductor_id;
        if (conductor_name) buses[busIndex].conductor_name = conductor_name;

        writeJson(BUSES_FILE, buses);

        if (supabase) {
            supabase.from('buses').update({
                conductor_id: conductor_id,
                conductor_name: conductor_name || null
            }).eq('bus_no', bus_no).then().catch(err => console.error('Supabase error:', err));
        }

        res.json({ message: 'Conductor updated', bus_no, conductor_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============================== OTHER API ENDPOINTS ============================== */

app.get('/api/buses', (req, res) => res.json(readJson(BUSES_FILE)));

// Live status summary endpoint
app.get('/summary', (req, res) => {
    try {
        const buses = readJson(BUSES_FILE);
        const students = readJson(STUDENTS_FILE);
        const tickets = purgeOldTickets();

        const summary = buses.map((bus) => {
            const busStudents = students.filter((s) => s.bus_no === bus.bus_no);
            const busTickets = tickets.filter((t) => t.bus_no === bus.bus_no);

            const occupied = busStudents.length + busTickets.length;
            const presentToday = busStudents.filter((s) => s.present).length + busTickets.filter((t) => t.present).length;

            return {
                bus_no: bus.bus_no,
                capacity: bus.capacity ?? 36,
                occupied: occupied,
                present_today: presentToday,
                route: bus.route || 'Unknown',
            };
        });

        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

// Incharge summary endpoint (same as live status but with different route)
app.get('/api/incharge/summary', (req, res) => {
    try {
        const buses = readJson(BUSES_FILE);
        const students = readJson(STUDENTS_FILE);
        const tickets = purgeOldTickets();

        const summary = buses.map((bus) => {
            const busStudents = students.filter((s) => s.bus_no === bus.bus_no);
            const busTickets = tickets.filter((t) => t.bus_no === bus.bus_no);

            const occupied = busStudents.length + busTickets.length;
            const presentToday = busStudents.filter((s) => s.present).length + busTickets.filter((t) => t.present).length;

            return {
                bus_no: bus.bus_no,
                capacity: bus.capacity ?? 36,
                occupied: occupied,
                present_today: presentToday,
                route: bus.route || null,
            };
        });

        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: "Failed to generate incharge summary" });
    }
});

// Incharge alert endpoint
app.post('/api/incharge/alert', (req, res) => {
    try {
        const { incharge_id, message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }

        // For now, just log the alert. In a real app, you'd send notifications
        console.log(`ALERT from ${incharge_id}: ${message}`);

        res.json({ message: 'Alert sent successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============================== CONDUCTOR ENDPOINTS ============================== */

// Get conductor assignment (bus_no for conductor_id)
app.get('/api/conductor/:conductorId', (req, res) => {
    try {
        const { conductorId } = req.params;
        const buses = readJson(BUSES_FILE);

        // Find bus assigned to this conductor
        const bus = buses.find(b => b.conductor_id === conductorId);
        if (!bus) {
            return res.status(404).json({ error: 'Conductor not assigned to any bus' });
        }

        res.json({ bus_no: bus.bus_no });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update student attendance
app.post('/api/conductor/attendance', (req, res) => {
    try {
        const { student_id, present, conductor_id } = req.body;
        if (!student_id) {
            return res.status(400).json({ error: 'student_id required' });
        }

        const students = readJson(STUDENTS_FILE);
        const tickets = readJson(TICKETS_FILE);

        // Update in permanent students
        let updated = false;
        for (let i = 0; i < students.length; i++) {
            if (students[i].student_id === student_id) {
                students[i].present = !!present;
                updated = true;
                break;
            }
        }

        // Update in temporary tickets
        if (!updated) {
            for (let i = 0; i < tickets.length; i++) {
                if (tickets[i].student_id === student_id) {
                    tickets[i].present = !!present;
                    updated = true;
                    break;
                }
            }
        }

        if (!updated) {
            return res.status(404).json({ error: 'Student not found' });
        }

        writeJson(STUDENTS_FILE, students);
        writeJson(TICKETS_FILE, tickets);

        res.json({ message: 'Attendance updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add one-day ticket
app.post('/api/conductor/ticket', (req, res) => {
    try {
        const { conductor_id, name, student_id } = req.body;
        if (!conductor_id || !name) {
            return res.status(400).json({ error: 'conductor_id and name required' });
        }

        const buses = readJson(BUSES_FILE);
        const bus = buses.find(b => b.conductor_id === conductor_id);
        if (!bus) {
            return res.status(404).json({ error: 'Conductor not assigned to bus' });
        }

        const tickets = readJson(TICKETS_FILE);
        const seat = nextAvailableSeat(buses, readJson(STUDENTS_FILE), tickets, bus.bus_no);

        if (!seat) {
            return res.status(400).json({ error: 'No seats available' });
        }

        const ticket = {
            student_id: student_id || `TICKET_${Date.now()}`,
            name,
            bus_no: bus.bus_no,
            seat,
            present: false,
            date: todayISO(),
        };

        tickets.push(ticket);
        writeJson(TICKETS_FILE, tickets);

        res.json({ message: 'Ticket added', ticket });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add permanent student
app.post('/api/conductor/add-student', (req, res) => {
    try {
        const { conductor_id, name, student_id } = req.body;
        if (!conductor_id || !name || !student_id) {
            return res.status(400).json({ error: 'conductor_id, name, and student_id required' });
        }

        const buses = readJson(BUSES_FILE);
        const bus = buses.find(b => b.conductor_id === conductor_id);
        if (!bus) {
            return res.status(404).json({ error: 'Conductor not assigned to bus' });
        }

        const students = readJson(STUDENTS_FILE);
        const tickets = readJson(TICKETS_FILE);

        // Check if student already exists
        if (students.find(s => s.student_id === student_id)) {
            return res.status(400).json({ error: 'Student already exists' });
        }

        const seat = nextAvailableSeat(buses, students, tickets, bus.bus_no);
        if (!seat) {
            return res.status(400).json({ error: 'No seats available' });
        }

        const student = {
            student_id,
            name,
            bus_no: bus.bus_no,
            seat,
            present: false,
            fee_paid: false,
        };

        students.push(student);
        writeJson(STUDENTS_FILE, students);

        res.json({ message: 'Student added', student });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove ticket
app.delete('/api/conductor/ticket/:studentId', (req, res) => {
    try {
        const { studentId } = req.params;
        const tickets = readJson(TICKETS_FILE);

        const index = tickets.findIndex(t => t.student_id === studentId);
        if (index === -1) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        tickets.splice(index, 1);
        writeJson(TICKETS_FILE, tickets);

        res.json({ message: 'Ticket removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============================== ADJUSTMENT ENDPOINTS ============================== */

/* ============================== FACULTY MANAGEMENT ============================== */

// Create new faculty record
app.post('/api/mto/faculty', (req, res) => {
    try {
        const { name, phone, department } = req.body;
        if (!name || !phone || !department) {
            return res.status(400).json({ error: 'name, phone and department required' });
        }
        const faculties = readJson(FACULTIES_FILE);
        const id = `FAC${(faculties.length + 1).toString().padStart(3, '0')}`;
        const faculty = { faculty_id: id, name, phone, department };
        faculties.push(faculty);
        writeJson(FACULTIES_FILE, faculties);
        res.json(faculty);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Faculty route-change request (mobile app sends POST with faculty_id)
app.post('/api/faculty/request-route-change', (req, res) => {
    try {
        const { faculty_id } = req.body;
        if (!faculty_id) {
            return res.status(400).json({ error: 'faculty_id required' });
        }
        // For now simply log the request. Could be stored or notified later.
        console.log(`Faculty ${faculty_id} requested route change.`);
        res.json({ message: 'request received', faculty_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List all faculties
app.get('/api/mto/faculties', (req, res) => {
    try {
        res.json(readJson(FACULTIES_FILE));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============================== CHAT ENDPOINTS ============================== */

// send chat message
app.post('/api/chat/send', (req, res) => {
    try {
        const { role, user_id, name, message } = req.body;
        if (!role || !user_id || !name || !message) {
            return res.status(400).json({ error: 'role, user_id, name, message required' });
        }
        const chats = readJson(CHAT_FILE);
        const entry = { role, user_id, name, message, ts: new Date().toISOString() };
        chats.push(entry);
        writeJson(CHAT_FILE, chats);
        res.json({ message: 'sent', entry });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// get chat messages optionally since timestamp
app.get('/api/chat/messages', (req, res) => {
    try {
        const since = req.query.since;
        let chats = readJson(CHAT_FILE);
        if (since) {
            chats = chats.filter(c => c.ts > since);
        }
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============================== ADJUSTMENT ENDPOINTS ============================== */

// Adjust buses for off-day (consolidate routes)
app.post('/adjust-offday', (req, res) => {
    try {
        const { date, routes, off, apply } = req.body;

        console.log('Adjust off-day request:', JSON.stringify(req.body, null, 2));

        if (!routes || !Array.isArray(routes) || routes.length === 0) {
            return res.status(400).json({ error: 'routes array required' });
        }

        const buses = readJson(BUSES_FILE);
        const students = readJson(STUDENTS_FILE);

        console.log(`Processing ${routes.length} routes, ${buses.length} buses, ${students.length} students`);

        // Filter buses by selected routes
        const routeBuses = buses.filter(bus => routes.some(route =>
            normalizeRoute(bus.route) === normalizeRoute(route)
        ));

        console.log(`Found ${routeBuses.length} buses matching routes`);

        // Mock adjustment logic - in real app this would be more complex
        const plans = routes.map(route => {
            try {
                const routeBusesForRoute = routeBuses.filter(bus =>
                    normalizeRoute(bus.route) === normalizeRoute(route)
                );

                console.log(`Route ${route}: ${routeBusesForRoute.length} buses`);

                if (routeBusesForRoute.length === 0) {
                    return {
                        route,
                        keep_bus_no: null,
                        suspend_bus_nos: [],
                        moved: [],
                        overflow: []
                    };
                }

                // Keep the bus with most capacity
                const sortedBuses = routeBusesForRoute.sort((a, b) => (b.capacity || 36) - (a.capacity || 36));
                const keepBus = sortedBuses[0];
                const suspendBuses = sortedBuses.slice(1);

                return {
                    route,
                    keep_bus_no: keepBus.bus_no,
                    suspend_bus_nos: suspendBuses.map(b => b.bus_no),
                    moved: [],
                    overflow: []
                };
            } catch (err) {
                console.error(`Error processing route ${route}:`, err);
                return {
                    route,
                    keep_bus_no: null,
                    suspend_bus_nos: [],
                    moved: [],
                    overflow: [],
                    error: err.message
                };
            }
        });

        const response = {
            message: apply ? 'Adjustments applied successfully' : 'Adjustment preview generated',
            plans
        };

        console.log('Sending response:', JSON.stringify(response, null, 2));
        res.json(response);

    } catch (err) {
        console.error('Adjust off-day error:', err);
        res.status(500).json({
            error: err.message,
            plans: []
        });
    }
});

/* ───────────────────────────── Student Routes ───────────────────────────── */

// 1. Get ALL students (or filtered by bus_no)
app.get('/api/students', (req, res) => {
    try {
        const busNo = req.query.bus_no ? parseInt(req.query.bus_no, 10) : null;
        const students = readJson(STUDENTS_FILE);
        const tickets = purgeOldTickets();
        
        const merged = [
            ...students.map((s) => ({ ...s, is_temp: false })),
            ...tickets.map((t) => ({
                student_id: t.student_id,
                name: t.name,
                bus_no: t.bus_no,
                seat: t.seat,
                present: !!t.present,
                fee_paid: false,
                is_temp: true,
            })),
        ];

        const result = busNo ? merged.filter((s) => s.bus_no === busNo) : merged;
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch students" });
    }
});

// 2. Get a SINGLE student by ID (Fixes the "Unexpected token <" error)
app.get('/api/student/:id', (req, res) => {
    try {
        const { id } = req.params;
        const students = readJson(STUDENTS_FILE);
        
        // Find in permanent students or temporary tickets
        const student = students.find(s => s.student_id === id);
        
        if (!student) {
            // Check tickets if not in main list
            const tickets = readJson(TICKETS_FILE);
            const ticketStudent = tickets.find(t => t.student_id === id);
            
            if (ticketStudent) {
                return res.json({ ...ticketStudent, is_temp: true });
            }
            return res.status(404).json({ error: "Student not found" });
        }

        res.json({ ...student, is_temp: false });
    } catch (err) {
        res.status(500).json({ error: "Server error fetching student" });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.get('/', (req, res) => {
    res.send('<h2>BSMS Backend is Running</h2>');
});

module.exports = app;

/* ───────────────────────────── Start Server ───────────────────────────── */
const ip = getLocalIp();
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`
    🚀 BSMS Server Started
    -------------------------------------------
    Local:  http://localhost:${PORT}
    Network: http://${ip}:${PORT}
    -------------------------------------------
    Endpoints for CSV: /upload/bus, /upload/student
    `);
    });
}
