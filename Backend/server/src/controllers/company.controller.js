import Company from '../models/Company.js';
import { waEnabled, sendWhatsApp } from '../services/whatsapp.service.js';

const DEFAULTS = {
  name: 'Your Company Pvt. Ltd.', tagline: 'Attendance & Payroll', address: '12 Business Park', city: 'Mumbai',
  state: 'Maharashtra', zip: '400001', country: 'India', phone: '+91 98000 00000', email: 'hr@company.com',
  taxId: '', pfCode: '', managerName: '', managerTitle: 'Operations Manager', currency: 'INR',
};

export const get = async (req, res) => {
  const c = await Company.findOne();
  res.json(c || DEFAULTS);
};

export const update = async (req, res) => {
  let c = await Company.findOne();
  if (!c) c = new Company();
  Object.assign(c, req.body);
  await c.save();
  res.json(c);
};

export const integrations = (req, res) => res.json({
  email: !!process.env.SMTP_HOST,
  sms: !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN),
  whatsapp: waEnabled(),
  autoPayroll: process.env.AUTO_PAYROLL === 'true',
});

export const testWhatsApp = async (req, res) => {
  const to = req.body.to || req.user.phone;
  if (!to) return res.status(400).json({ message: 'No phone number — set one on your profile or pass { "to": "+91…" }' });
  const ok = await sendWhatsApp(to, 'StaffPay test — WhatsApp integration is working ✓');
  res.json({ ok, message: ok ? 'Test message sent' : 'Send failed — check WA_TOKEN / WA_PHONE_ID and that the number is an approved test recipient' });
};