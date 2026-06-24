import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  clubId: {
    type: String,
    required: true,
    index: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PRESENT', 'ABSENT'],
    required: true
  }
}, { timestamps: true });

// Ensure a student can only have one attendance record per club per day
attendanceSchema.index({ clubId: 1, studentEmail: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
