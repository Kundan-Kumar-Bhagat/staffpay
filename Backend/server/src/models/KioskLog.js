import mongoose from 'mongoose';
import { tenantScope } from './plugins/tenantScope.js';

const kioskLogSchema = new mongoose.Schema({
  name: { type: String, default: 'Worker' },
  phone: { type: String, required: true },
  date: { type: String, required: true },
  checkIn: String,
  checkOut: String,
  hours: { type: Number, default: 0 },
  status: { type: String, enum: ['present', 'late', 'half'], default: 'present' },
  note: String,
}, { timestamps: true });

kioskLogSchema.index({ phone: 1, date: 1, workspace: 1 }, { unique: true });
kioskLogSchema.plugin(tenantScope);
export default mongoose.model('KioskLog', kioskLogSchema);
