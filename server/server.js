const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
let buses = [];
let students = [];

// Multer: CSV upload config
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') cb(null, true);
    else cb(new Error('Only CSV allowed'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Ensure uploads folder
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// MTO Role Check
const isMTO = (req, res, next) => {
  const role = req.headers['x-role'];
  if (role !== 'mto') return res.status(403).json({ error: 'MTO access only' });
  next();
};

// === UPLOAD BUSES CSV ===
app.post('/api/mto/upload-buses', isMTO, upload.single('csv'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const filePath = req.file.path;
  const results = [];

  fs.createReadStream(filePath)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', (row) => {
      results.push({
        bus_no: parseInt(row.bus_no),
        vehicle_no: row.vehicle_no,
        driver: row.driver,
        driver_contact: row.driver_contact,
        helper: row.helper,
        helper_contact: row.helper_contact,
        route: row.route,
        time: row.time
      });
    })
    .on('end', () => {
      buses = results;
      fs.unlinkSync(filePath);
      res.json({ message: 'Buses uploaded', count: buses.length });
    })
    .on('error', (err) => {
      fs.unlinkSync(filePath);
      res.status(500).json({ error: 'CSV parse failed' });
    });
});

// === UPLOAD STUDENTS CSV ===
app.post('/api/mto/upload-students', isMTO, upload.single('csv'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const filePath = req.file.path;
  const results = [];

  fs.createReadStream(filePath)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', (row) => {
      const route = row.route;
      const bus = buses.find(b => b.route === route);

      if (row.fee_paid.toLowerCase() === 'yes') {
        if (!bus) return; // Invalid route

        // Avoid duplicates
        students = students.filter(s => s.student_id !== row.student_id);
        students.push({
          student_id: row.student_id,
          name: row.name,
          course: row.course,
          year: parseInt(row.year),
          route: route,
          bus_no: bus.bus_no,
          seat: null
        });
      } else {
        students = students.filter(s => s.student_id !== row.student_id);
      }
    })
    .on('end', () => {
      fs.unlinkSync(filePath);
      res.json({ message: 'Students processed', total: students.length });
    })
    .on('error', (err) => {
      fs.unlinkSync(filePath);
      res.status(500).json({ error: 'CSV parse failed' });
    });
});

// === GET APIs ===
app.get('/api/buses', (req, res) => res.json(buses));
app.get('/api/students', (req, res) => res.json(students));

// Health check
app.get('/', (req, res) => res.send('BSMS Backend Running!'));

// Start Server
app.listen(PORT, () => {
  console.log(`Backend live: http://localhost:${PORT}`);
});