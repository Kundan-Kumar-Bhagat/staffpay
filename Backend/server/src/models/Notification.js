import mongoose from 'mongoose';
import { tenantScope } from './plugins/tenantScope.js';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['payslip', 'leave', 'attendance', 'system'], default: 'system' },
  title: String,
  body: String,
  link: String,
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.plugin(tenantScope);

export default mongoose.model('Notification', notificationSchema);
