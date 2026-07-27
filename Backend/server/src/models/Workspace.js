import mongoose from 'mongoose';
import crypto from 'crypto';
import { PLANS } from '../config/plans.js';

const settingsSchema = new mongoose.Schema({
  tagline: String, address: String, city: String, state: String, zip: String, country: String,
  phone: String, email: String, website: String, taxId: String, pfCode: String,
  managerName: String, managerTitle: { type: String, default: 'Operations Manager' },
  currency: { type: String, default: 'INR' }, workStart: { type: String, default: '09:30' },
  pfRate: { type: Number, default: 12 }, taxRate: { type: Number, default: 5 },
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
  holidays: { type: [String], default: [] },
  bank: { name: String, accountNo: String, ifsc: String },
  payslip: {
    tagline: { type: Boolean, default: true }, address: { type: Boolean, default: true },
    contact: { type: Boolean, default: true }, taxIds: { type: Boolean, default: true },
    statutory: { type: Boolean, default: true }, breakdown: { type: Boolean, default: true },
    words: { type: Boolean, default: true }, attendanceStrip: { type: Boolean, default: true },
    declaration: { type: Boolean, default: true }, signature: { type: Boolean, default: true },
    verifyFooter: { type: Boolean, default: true },
  },
  invoice: {
    taxIds: { type: Boolean, default: true }, bank: { type: Boolean, default: true },
    words: { type: Boolean, default: true }, notes: { type: Boolean, default: true },
  },
  leaveQuotas: { casual: { type: Number, default: 12 }, sick: { type: Number, default: 8 }, unpaid: { type: Number, default: 30 } },
}, { _id: false });

const billingSchema = new mongoose.Schema({
  customerId: String,
  subscriptionId: String,
  status: { type: String, enum: ['trialing', 'active', 'past_due', 'canceled', 'expired', 'demo'], default: 'trialing' },
  seats: { type: Number, default: 10 },
  trialEndsAt: Date,
  renewsAt: Date,
}, { _id: false });

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  joinCode: { type: String, unique: true },
  plan: { type: String, enum: ['trial', 'pro'], default: 'trial' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  settings: { type: settingsSchema, default: () => ({}) },
  billing: { type: billingSchema, default: () => ({}) },
}, { timestamps: true });

export const PLAN_LIMITS = { trial: { staff: 10 }, pro: { staff: Infinity } };

export const newTrial = () => ({
  status: 'trialing',
  seats: PLANS.trial.seats,
  trialEndsAt: new Date(Date.now() + PLANS.trial.trialDays * 86400000),
});

export const genJoinCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
export const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ws';

// The object pdf/excel services and the frontend already understand
export const companyView = ws => ({
  name: ws.name,
  ...(ws.settings?.toObject ? ws.settings.toObject() : ws.settings || {}),
  workspaceId: ws._id,
});

export default mongoose.model('Workspace', workspaceSchema);
