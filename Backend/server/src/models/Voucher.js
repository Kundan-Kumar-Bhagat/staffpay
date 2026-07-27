import mongoose from 'mongoose';
import { tenantScope } from './plugins/tenantScope.js';

const voucherSchema = new mongoose.Schema({
  number: { type: String, unique: true },
  payee: { name: { type: String, required: true }, phone: String, email: String, idType: String, idNumber: String, address: String },
  description: { type: String, required: true },
  from: String, to: String,
  qty: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  deductions: { tds: { type: Number, default: 0 }, advance: { type: Number, default: 0 }, other: { type: Number, default: 0 } },
  net: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ['cash', 'bank', 'upi', 'cheque'], default: 'cash' },
  paymentRef: String,
  note: String,
  status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  paidAt: Date,
}, { timestamps: true });

voucherSchema.plugin(tenantScope);
export default mongoose.model('Voucher', voucherSchema);
