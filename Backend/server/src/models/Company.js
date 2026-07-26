import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: String, tagline: String,
  address: String, city: String, state: String, zip: String, country: String,
  phone: String, email: String, website: String,
  taxId: String, pfCode: String,
  managerName: String, managerTitle: { type: String, default: 'Operations Manager' },
  currency: { type: String, default: 'INR' },
  workStart: { type: String, default: '09:30' },
  pfRate: { type: Number, default: 12 },
  taxRate: { type: Number, default: 5 },
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // Sun=0 … Sat=6
  holidays: { type: [String], default: [] }, // ['2026-08-15', …]
  bank: { name: String, accountNo: String, ifsc: String },
  payslip: {
    tagline: { type: Boolean, default: true },
    address: { type: Boolean, default: true },
    contact: { type: Boolean, default: true },
    taxIds: { type: Boolean, default: true },        // GSTIN + PF code in header
    statutory: { type: Boolean, default: true },      // PAN, PF/UAN, bank, manager, location
    breakdown: { type: Boolean, default: true },      // earnings/deductions tables vs compact summary
    words: { type: Boolean, default: true },          // net pay in words
    attendanceStrip: { type: Boolean, default: true },
    declaration: { type: Boolean, default: true },
    signature: { type: Boolean, default: true },
    verifyFooter: { type: Boolean, default: true },
  },
  invoice: {
    taxIds: { type: Boolean, default: true },
    bank: { type: Boolean, default: true },
    words: { type: Boolean, default: true },
    notes: { type: Boolean, default: true },
  },
  leaveQuotas: {
    casual: { type: Number, default: 12 },
    sick: { type: Number, default: 8 },
    unpaid: { type: Number, default: 30 },
  },
}, { timestamps: true });

export default mongoose.model('Company', companySchema);