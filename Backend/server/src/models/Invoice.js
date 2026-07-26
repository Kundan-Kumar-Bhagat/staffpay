import mongoose from 'mongoose';
import { tenantScope } from './plugins/tenantScope.js';

const invoiceSchema = new mongoose.Schema({
  number: { type: String },
  client: { name: String, email: String, phone: String, address: String, taxId: String },
  items: [{ description: String, qty: { type: Number, default: 1 }, rate: { type: Number, default: 0 } }],
  taxRate: { type: Number, default: 18 },
  discount: { type: Number, default: 0 },
  issueDate: String,
  dueDate: String,
  notes: String,
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.index({ workspace: 1, number: 1 }, { unique: true });
invoiceSchema.plugin(tenantScope);

export default mongoose.model('Invoice', invoiceSchema);