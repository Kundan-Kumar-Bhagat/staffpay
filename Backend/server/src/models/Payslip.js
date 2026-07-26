import mongoose from 'mongoose';
import { tenantScope } from './plugins/tenantScope.js';

const payslipSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },
  monthName: String,
  serial: { type: String, unique: true },
  earnings: { basic: Number, hra: Number, allowances: Number, overtime: Number },
  deductions: { pf: Number, tax: Number, absent: Number, unpaidLeave: Number, advance: Number },
  gross: Number,
  totalDeductions: Number,
  net: Number,
  days: { working: Number, present: Number, late: Number, absent: Number, leave: Number, half: Number, hours: Number },
  status: { type: String, enum: ['draft', 'issued'], default: 'issued' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

payslipSchema.index({ user: 1, month: 1, workspace: 1 }, { unique: true });
payslipSchema.plugin(tenantScope);

export default mongoose.model('Payslip', payslipSchema);