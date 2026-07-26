import { companyView } from '../models/Workspace.js';
import { waEnabled, sendWhatsApp } from '../services/whatsapp.service.js';

export const get = (req, res) => res.json(companyView(req.workspace));

export const update = async (req, res) => {
  const { name, ...rest } = req.body;
  if (name) req.workspace.name = name;
  Object.assign(req.workspace.settings, rest);
  await req.workspace.save();
  res.json(companyView(req.workspace));
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