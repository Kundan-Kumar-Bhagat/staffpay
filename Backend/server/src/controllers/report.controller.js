import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Payslip from '../models/Payslip.js';
import Company from '../models/Company.js';
import { currentMonth, prevMonth, monthName, workingDaysIn, dstr } from '../utils/helpers.js';

export const summary = async (req, res) => {
  const month = req.query.month || currentMonth();
  const company = await Company.findOne();
  const [users, att, slips] = await Promise.all([
    User.find({ status: 'active' }),
    Attendance.find({ date: { $regex: `^${month}` } }),
    Payslip.find({ month }),
  ]);
  const c = { present: 0, late: 0, absent: 0, leave: 0, half: 0 };
  const t = { present: 0, late: 0, absent: 0, leave: 0, half: 0 };
  const today = dstr();
  att.forEach(a => {
    c[a.status] = (c[a.status] || 0) + 1;
    if (a.date === today) t[a.status] = (t[a.status] || 0) + 1;
  });
  const ok = c.present + c.late + c.half;
  res.json({
    month,
    headcount: users.length,
    counts: c,
    today: t,
    todayTotal: Object.values(t).reduce((a, b) => a + b, 0),
    wd: workingDaysIn(month, company?.workingDays),
    payroll: slips.reduce((s, p) => s + p.net, 0),
    gross: slips.reduce((s, p) => s + p.gross, 0),
    slips: slips.length,
    rate: att.length ? Math.round((ok / att.length) * 100) : 0,
  });
};

export const daily = async (req, res) => {
  const month = req.query.month || currentMonth();
  const rows = await Attendance.find({ date: { $regex: `^${month}` } }).sort('date');
  const map = {};
  rows.forEach(r => { (map[r.date] ||= { present: 0, late: 0, absent: 0, leave: 0, half: 0 })[r.status]++; });
  res.json(Object.entries(map).map(([date, c]) => ({ date: date.slice(8), ...c })));
};

export const trend = async (req, res) => {
  const n = +req.query.months || 6;
  const months = Array.from({ length: n }, (_, i) => prevMonth(currentMonth(), n - 1 - i));
  const out = [];
  for (const m of months) {
    const [slips, att] = await Promise.all([Payslip.find({ month: m }), Attendance.find({ date: { $regex: `^${m}` } })]);
    const ok = att.filter(a => ['present', 'late', 'half'].includes(a.status)).length;
    out.push({
      month: m, label: monthName(m).split(' ')[0].slice(0, 3),
      payroll: slips.reduce((s, p) => s + p.net, 0),
      rate: att.length ? Math.round((ok / att.length) * 100) : 0,
    });
  }
  res.json(out);
};

export const staffMonth = async (req, res) => {
  const month = req.query.month || currentMonth();
  const [users, att, slips] = await Promise.all([
    User.find({ status: 'active', role: { $ne: 'admin' } }),
    Attendance.find({ date: { $regex: `^${month}` } }),
    Payslip.find({ month }),
  ]);
  res.json(users.map(u => {
    const rows = att.filter(a => String(a.user) === String(u._id));
    const c = { present: 0, late: 0, absent: 0, leave: 0, half: 0 };
    rows.forEach(a => c[a.status]++);
    const slip = slips.find(p => String(p.user) === String(u._id));
    return { id: u._id, name: u.name, employeeId: u.employeeId, designation: u.designation, ...c, hours: Math.round(rows.reduce((s, a) => s + (a.hours || 0), 0)), net: slip?.net ?? null };
  }));
};