import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, enum: ['checkin', 'checkout', 'mark', 'payslip', 'invoice', 'user', 'login', 'leave'] },
  detail: String,
}, { timestamps: true });

export default mongoose.model('Activity', activitySchema);