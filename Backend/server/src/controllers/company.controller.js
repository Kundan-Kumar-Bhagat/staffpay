import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { companyView } from '../models/Workspace.js';
import { waEnabled, sendWhatsApp } from '../services/whatsapp.service.js';

const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg' };
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), 'uploads');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `logo-${req.wid}${ALLOWED[file.mimetype]}`),
  }),
  limits: { fileSize: 400 * 1024 },
  fileFilter: (req, file, cb) => cb(null, !!ALLOWED[file.mimetype]),
});

export const logoUpload = [
  upload.single('logo'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Send a PNG / JPG / WebP / SVG under 400 KB as field "logo"' });
    req.workspace.settings.brand = {
      ...(req.workspace.settings.brand || {}),
      logoUrl: `/uploads/${req.file.filename}?v=${Date.now()}`,
    };
    await req.workspace.save();
    res.json({ logoUrl: req.workspace.settings.brand.logoUrl });
  },
];

export const logoRemove = async (req, res) => {
  const b = req.workspace.settings.brand || {};
  if (b.logoUrl) {
    try { fs.unlinkSync(path.join(process.cwd(), 'uploads', b.logoUrl.split('?')[0].split('/').pop())); } catch {}
  }
  req.workspace.settings.brand = { ...b, logoUrl: undefined };
  await req.workspace.save();
  res.json({ message: 'Logo removed' });
};

export const get = (req, res) => res.json(companyView(req.workspace));

export const update = async (req, res) => {
  const { name, ...rest } = req.body;
  if (name) req.workspace.name = name;
  Object.assign(req.workspace.settings, rest);
  if (req.workspace.settings.kiosk?.enabled && !req.workspace.settings.kiosk.code)
    req.workspace.settings.kiosk.code = String(Math.floor(100000 + Math.random() * 900000));
  try { await req.workspace.save(); }
  catch { return res.status(400).json({ message: 'Invalid brand values — accent must be a #RRGGBB hex' }); }
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