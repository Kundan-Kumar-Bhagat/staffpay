import Leave from '../models/Leave.js';
import Attendance from '../models/Attendance.js';
import Company from '../models/Company.js';
import { dstr } from '../utils/helpers.js';
import { logActivity } from '../utils/log.js';
import { notify } from '../utils/notify.js';

const eachDay = (from, to) => {
  const days = [];
  const d = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (d <= end) { days.push(dstr(d)); d.setDate(d.getDate() + 1); }
  return days;
};

export const apply = async (req, res) => {
  const { from, to, type = 'casual', reason } = req.body;
  if (!from || !to || to < from) return res.status(400).json({ message: 'Provide a valid date range' });
  const requested = eachDay(from, to).length;
  if (requested > 30) return res.status(400).json({ message: 'A single request can cover at most 30 days' });
  const clash = await Leave.findOne({ user: req.user._id, status: 'pending', from: { $lte: to }, to: { $gte: from } });
  if (clash) return res.status(409).json({ message: 'You already have a pending request overlapping these dates' });

  const company = await Company.findOne();
  const quota = company?.leaveQuotas?.[type] ?? { casual: 12, sick: 8, unpaid: 30 }[type];
  if (type !== 'unpaid') {
    const year = new Date().getFullYear();
    const usedRows = await Leave.find({ user: req.user._id, status: 'approved', from: { $regex: `^${year}` }, type });
    const used = usedRows.reduce((s, l) => s + (l.days || eachDay(l.from, l.to).length), 0);
    if (used + requested > quota)
      return res.status(400).json({ message: `Not enough ${type} leave — ${Math.max(0, quota - used)} day(s) left this year. Try unpaid leave.` });
  }

  const leave = await Leave.create({ user: req.user._id, from, to, type, reason, days: requested });
  logActivity(req.user, 'leave', `requested ${requested}d ${type} leave (${from} → ${to})`);
  res.status(201).json(leave);
};

export const list = async (req, res) => {
  const filter = req.user.role === 'staff' ? { user: req.user._id } : {};
  if (req.query.status) filter.status = req.query.status;
  res.json(await Leave.find(filter).populate('user', 'name employeeId designation').sort('-createdAt'));
};

export const balance = async (req, res) => {
  const company = await Company.findOne();
  const quotas = { casual: 12, sick: 8, unpaid: 30, ...(company?.leaveQuotas?.toObject?.() || company?.leaveQuotas || {}) };
  const year = new Date().getFullYear();
  const rows = await Leave.find({ user: req.user._id, status: 'approved', from: { $regex: `^${year}` } });
  res.json(Object.entries(quotas).map(([type, quota]) => {
    const used = rows.filter(l => l.type === type).reduce((s, l) => s + (l.days || eachDay(l.from, l.to).length), 0);
    return { type, quota, used, left: Math.max(0, quota - used) };
  }));
};

export const decide = async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected' });
  const leave = await Leave.findById(req.params.id).populate('user', 'name');
  if (!leave) return res.status(404).json({ message: 'Request not found' });
  if (leave.status !== 'pending') return res.status(400).json({ message: 'This request was already decided' });
  leave.status = status;
  leave.decidedBy = req.user._id;
  leave.decidedAt = new Date();
  await leave.save();

  if (status === 'approved') {
    for (const date of eachDay(leave.from, leave.to)) {
      const rec = await Attendance.findOne({ user: leave.user._id, date });
      if (rec?.checkIn) continue; // never overwrite a day actually worked
      await Attendance.findOneAndUpdate(
        { user: leave.user._id, date },
        { user: leave.user._id, date, status: 'leave', note: `${leave.type} leave (approved)`, markedBy: req.user._id },
        { upsert: true, setDefaultsOnInsert: true });
    }
  }
  logActivity(req.user, 'leave', `${status} ${leave.user.name}'s leave (${leave.from} → ${leave.to})`);
  notify(leave.user._id, 'leave', status === 'approved' ? 'Leave approved' : 'Leave request rejected',
    `${leave.type} leave, ${leave.from} → ${leave.to}${status === 'approved' ? ' — attendance has been updated.' : ''}`, '/leave');
  res.json(leave);
};

export const cancel = async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, user: req.user._id });
  if (!leave) return res.status(404).json({ message: 'Request not found' });
  if (leave.status !== 'pending') return res.status(400).json({ message: 'Only pending requests can be withdrawn' });
  await leave.deleteOne();
  res.json({ message: 'Request withdrawn' });
};
