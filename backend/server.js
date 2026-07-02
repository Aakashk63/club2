import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Club } from './models/Club.js';
import { Booking } from './models/Booking.js';
import { Report } from './models/Report.js';
import Attendance from './models/Attendance.js';
import { User } from './models/User.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage: storage });

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log('Connected to MongoDB');
  try {
    const adminEmail = 'akaakashsvg63@gmail.com';
    const admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      await User.create({ name: 'Admin User', email: adminEmail, password: 'mukesh@2198', role: 'admin' });
    }
    const secondAdminEmail = 'aakash.k.admin.com';
    const secondAdmin = await User.findOne({ email: secondAdminEmail });
    if (!secondAdmin) {
      await User.create({ name: 'Second Admin', email: secondAdminEmail, password: '1234', role: 'admin' });
    }
    const staffEmail = 'mukesh710017@gmail.com';
    const staff = await User.findOne({ email: staffEmail });
    if (!staff) {
      await User.create({ name: 'Robotics Coordinator', email: staffEmail, password: 'mukesh@2198', role: 'staff', clubId: 'robotics' });
    }
  } catch (err) {
    console.error('Error seeding initial users:', err);
  }
})
.catch(err => console.error('MongoDB connection error:', err));

// Seed Clubs Route (Initial Data Load)
app.post('/api/clubs/seed', async (req, res) => {
  try {
    const clubs = req.body.map(c => ({
      ...c,
      slotsFirstYear: 110,
      slotsSecondYear: 110,
      slotsThirdYear: 110,
      slotsFourthYear: 110
    }));
    await Club.deleteMany({});
    await Club.insertMany(clubs);
    res.json({ message: 'Clubs seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all clubs
app.get('/api/clubs', async (req, res) => {
  try {
    const { year } = req.query;
    let clubs = await Club.find().lean();
    if (year) {
      clubs = clubs.map(c => {
        let slots = c.slotsRemaining;
        if (year === 'First Year') slots = c.slotsFirstYear;
        else if (year === 'Second Year') slots = c.slotsSecondYear;
        else if (year === 'Third Year') slots = c.slotsThirdYear;
        else if (year === 'Fourth Year') slots = c.slotsFourthYear;
        return { ...c, slotsRemaining: slots !== undefined ? slots : c.slotsRemaining };
      });
    }
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update single club slot
app.put('/api/clubs/:id/slots', async (req, res) => {
  try {
    const { slotsRemaining } = req.body;
    const club = await Club.findOneAndUpdate({ id: req.params.id }, { slotsRemaining }, { new: true });
    res.json(club);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset all clubs slots
app.put('/api/clubs/reset-all', async (req, res) => {
  try {
    const { capacity } = req.body;
    const cap = capacity || 110;
    await Club.updateMany({}, { 
      slotsRemaining: cap,
      slotsFirstYear: cap,
      slotsSecondYear: cap,
      slotsThirdYear: cap,
      slotsFourthYear: cap
    });
    const clubs = await Club.find();
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Erase all bookings
app.delete('/api/bookings/all', async (req, res) => {
  try {
    await Booking.deleteMany({});
    res.json({ message: 'All bookings erased successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const bookingDetails = req.body;
    
    // Check if slot available
    const club = await Club.findOne({ id: bookingDetails.clubId });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    
    const year = bookingDetails.studentYear;
    let currentSlots = club.slotsRemaining;
    if (year === 'First Year') currentSlots = club.slotsFirstYear;
    else if (year === 'Second Year') currentSlots = club.slotsSecondYear;
    else if (year === 'Third Year') currentSlots = club.slotsThirdYear;
    else if (year === 'Fourth Year') currentSlots = club.slotsFourthYear;

    if (currentSlots <= 0) {
      return res.status(409).json({ error: 'Conflict: No slots remaining for your year' });
    }

    // Check duplicate (One club per student)
    const existing = await Booking.findOne({ studentEmail: bookingDetails.studentEmail });
    if (existing) {
      return res.status(400).json({ error: 'Duplicate booking: You are already registered for a club.' });
    }

    // Decrement slots
    if (year === 'First Year') club.slotsFirstYear -= 1;
    else if (year === 'Second Year') club.slotsSecondYear -= 1;
    else if (year === 'Third Year') club.slotsThirdYear -= 1;
    else if (year === 'Fourth Year') club.slotsFourthYear -= 1;
    else club.slotsRemaining -= 1;

    await club.save();

    const booking = new Booking(bookingDetails);
    await booking.save();
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update attendance
app.put('/api/bookings/:id/attendance', async (req, res) => {
  try {
    const { attendance } = req.body;
    const booking = await Booking.findOneAndUpdate({ bookingId: req.params.id }, { attendance }, { new: true });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a booking
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({ bookingId: req.params.id });
    if (booking) {
      // Restore slot
      await Club.findOneAndUpdate({ id: booking.clubId }, { $inc: { slotsRemaining: 1 } });
    }
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all reports
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a new report
app.post('/api/reports', upload.single('report'), async (req, res) => {
  try {
    const { clubId, clubName, submittedBy } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const report = new Report({
      clubId,
      clubName,
      submittedBy,
      fileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype
    });
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get all attendance records (optional filter by clubId)
app.get('/api/attendance', async (req, res) => {
  try {
    const { clubId } = req.query;
    const filter = clubId ? { clubId } : {};
    const records = await Attendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance records for a club
app.get('/api/attendance/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const records = await Attendance.find({ clubId }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upsert (Record/Update) Attendance
app.post('/api/attendance', async (req, res) => {
  try {
    const { clubId, studentEmail, studentName, date, status } = req.body;
    
    // Find and update if exists, otherwise create
    const record = await Attendance.findOneAndUpdate(
      { clubId, studentEmail, date },
      { studentName, status },
      { new: true, upsert: true }
    );
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, year } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const user = new User({ name, email, password, year });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Auto-create staff if @snsct.org and correct default password
    if (email.endsWith('@snsct.org') && password === 'snsct@123') {
      let staffUser = await User.findOne({ email });
      if (!staffUser) {
        const clubId = email.split('@')[0];
        const clubExists = await Club.findOne({ id: clubId });
        if (clubExists) {
          staffUser = new User({ 
            email, 
            name: clubId.charAt(0).toUpperCase() + clubId.slice(1) + ' Coordinator',
            password,
            role: 'staff',
            clubId
          });
          await staffUser.save();
        }
      }
    }

    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, role, year } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, name, password: 'google-oauth', role: role || 'student', year });
      await user.save();
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, retrying in 1s...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    throw err;
  }
});

// Graceful shutdown so node --watch can release the port before restarting
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { server.close(() => process.exit(0)); });
