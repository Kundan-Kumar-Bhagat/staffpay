import jwt from 'jsonwebtoken';
import Workspace from '../models/Workspace.js';
import KioskLog from '../models/KioskLog.js';
import { dstr } from '../utils/helpers.js';

const numCode = () => String(Math.floor(100000 + Math.random() * 900000));

export const unlock = async (req, res) => {
  const { code } = req.body;
  const ws = await Workspace.findOne({ 'settings.kiosk.code': String(code || '').trim(), status: 'active' });
  if (!ws || !ws.settings.kiosk?.enabled) return res.status(401).json({ message: 'Invalid code or kiosk is disabled' });
  const token = jwt.sign({ wid: String(ws._id), kiosk: true }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, siteName: ws.settings.kiosk.siteName || ws.name, company: ws.name });
};

export const checkIn = async (req, res) => {
  const { phone, name } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number required' });
  const date = dstr();
  const time = new Date().toTimeString().slice(0, 5);
  const existing = await KioskLog.findOne({ phone, date });
  if (existing?.checkIn) return res.status(400).json({ message: `${existing.name} is already in (since ${existing.checkIn})` });
  const status = time > (req.workspace.settings.workStart || '09:30') ? 'late' : 'present';
  const rec = await KioskLog.findOneAndUpdate(
    { phone, date },
    { phone, date, checkIn: time, status, name: name || existing?.name || 'Worker' },
    { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json({ ok: true, name: rec.name, time, status });
};

export const checkOut = async (req, res) => {
  const { phone } = req.body;
  const rec = await KioskLog.findOne({ phone, date: dstr() });
  if (!rec?.checkIn) return res.status(400).json({ message: 'Not checked in today' });
  if (rec.checkOut) return res.status(400).json({ message: `${rec.name} already checked out at ${rec.checkOut}` });
  const time = new Date().toTimeString().slice(0, 5);
  const [ih, im] = rec.checkIn.split(':').map(Number);
  const [oh, om] = time.split(':').map(Number);
  rec.checkOut = time;
  rec.hours = Math.max(0, Math.round((oh * 60 + om - ih * 60 - im) / 60 * 10) / 10);
  if (rec.hours < 4.5 && rec.status === 'present') rec.status = 'half';
  await rec.save();
  res.json({ ok: true, name: rec.name, time, hours: rec.hours });
};

export const lookup = async (req, res) => {
  const { phone } = req.query;
  const last = await KioskLog.findOne({ phone }).sort('-date');
  const today = await KioskLog.findOne({ phone, date: dstr() });
  res.json({ name: last?.name || '', checkedIn: !!today?.checkIn, checkedOut: !!today?.checkOut });
};

export const today = async (req, res) => {
  const rows = await KioskLog.find({ date: dstr() }).sort('-updatedAt').limit(50);
  res.json({ rows, onSite: rows.filter(r => r.checkIn && !r.checkOut).length, total: rows.length });
};

export const logs = async (req, res) => {
  const { from, to, phone } = req.query;
  const filter = {};
  if (from || to) { filter.date = {}; if (from) filter.date.$gte = from; if (to) filter.date.$lte = to; }
  if (phone) filter.phone = phone;
  res.json(await KioskLog.find(filter).sort('-date'));
};

export const rotate = async (req, res) => {
  req.workspace.settings.kiosk.code = numCode();
  await req.workspace.save();
  res.json({ code: req.workspace.settings.kiosk.code });
};
