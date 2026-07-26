import mongoose from 'mongoose';
import { tenantScope } from './plugins/tenantScope.js';

const activitySchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, enum: ['checkin', 'checkout', 'mark', 'payslip', 'invoice', 'user', 'login', 'leave'] },
  detail: String,
}, { timestamps: true });

activitySchema.plugin(tenantScope);

export default mongoose.model('Activity', activitySchema);