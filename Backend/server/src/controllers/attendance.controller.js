import Attendance from '../models/Attendance.js';
import Company from '../models/Company.js';
import { dstr, currentMonth } from '../utils/helpers.js';
import { logActivity } from '../utils/log.js';
import { notify } from '../utils/notify.js';

export const checkIn = async (req, res) => {
  const date = dstr();
  const time = new Date().toTimeString().slice(0, 5);
  const existing = await Attendance.findOne({ user: req.user._id, date });
  if (existing?.checkIn) return res.status(400).json({ message: 'Already checked in today', record: existing });
  const company = await Company.findOne();
  const late = time > (company?.workStart || '09:30');
  const rec = await Attendance.findOneAndUpdate(
    { user: req.user._id, date },
    { user: req.user._id, date, checkIn: time, status: late ? 'late' : 'present', markedBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true });
  logActivity(req.user, 'checkin', `checked in at ${time}${late ? ' (late)' : ''}`);
  res.json({ message: late ? 'Checked in — marked late' : 'Checked in. Have a good day!', record: rec });
};

export const checkOut = async (req, res) => {
  const rec = await Attendance.findOne({ user: req.user._id, date: dstr() });
  if (!rec?.checkIn) return res.status(400).json({ message: 'Check in first' });
  if (rec.checkOut) return res.status(400).json({ message: 'Already checked out', record: rec });
  const time = new Date().toTimeString().slice(0, 5);
  const [ih, im] = rec.checkIn.split(':').map(Number), [oh, om] = time.split(':').map(Number);
  rec.checkOut = time;
  rec.hours = Math.max(0, Math.round((oh * 60 + om - ih * 60 - im) / 60 * 10) / 10);
  if (rec.hours < 4.5 && rec.status === 'present') rec.status = 'half';
  await rec.save();
  logActivity(req.user, 'checkout', `checked out — ${rec.hours}h logged`);
  res.json({ message: `Checked out — ${rec.hours}h logged`, record: rec });
};

export const today = async (req, res) => {
  const rec = await Attendance.findOne({ user: req.user._id, date: dstr() });
  res.json(rec || { date: dstr(), status: null });
};

export const list = async (req, res) => {
  const { month = currentMonth(), userId, date } = req.query;
  const filter = {};
  filter.date = date ? date : { $regex: `^${month}` };
  if (req.user.role === 'staff') filter.user = req.user._id;
  else if (userId) filter.user = userId;
  res.json(await Attendance.find(filter).populate('user', 'name employeeId designation color').sort('date'));
};

export const mark = async (req, res) => {
  const { date, entries } = req.body;
  if (!date || !Array.isArray(entries)) return res.status(400).json({ message: 'date and entries required' });
  for (const e of entries) {
    await Attendance.findOneAndUpdate(
      { user: e.userId, date },
      { user: e.userId, date, status: e.status, note: e.note || '', markedBy: req.user._id },
      { upsert: true, setDefaultsOnInsert: true });
    if (e.status === 'absent') notify(e.userId, 'attendance', 'Marked absent',
      `You were marked absent on ${date}. If that's wrong, contact your manager.`, '/calendar');
  }
  logActivity(req.user, 'mark', `marked ${entries.length} attendance entries for ${date}`);
  res.json({ message: `Saved ${entries.length} entries for ${date}` });
};

export const updateOne = async (req, res) => {
  const rec = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!rec) return res.status(404).json({ message: 'Not found' });
  res.json(rec);
};