import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: String,
  checkOut: String,
  status: { type: String, enum: ['present', 'late', 'absent', 'leave', 'half'], default: 'present' },
  hours: { type: Number, default: 0 },
  note: String,
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
export default mongoose.model('Attendance', attendanceSchema);