import mongoose from 'mongoose';
import { tenantScope } from './plugins/tenantScope.js';

const leaveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  from: { type: String, required: true }, // YYYY-MM-DD
  to: { type: String, required: true },
  type: { type: String, enum: ['casual', 'sick', 'unpaid'], default: 'casual' },
  reason: String,
  days: { type: Number, default: 1 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: Date,
}, { timestamps: true });

leaveSchema.plugin(tenantScope);

export default mongoose.model('Leave', leaveSchema);
