import Attendance from '../models/Attendance.js';
import Payslip from '../models/Payslip.js';
import { workingDaysIn, monthName } from '../utils/helpers.js';

export async function computeAndSavePayslip(user, month, company, byId) {
  const att = await Attendance.find({ user: user._id, date: { $regex: `^${month}` } });
  const c = { present: 0, late: 0, absent: 0, leave: 0, half: 0 };
  let hours = 0;
  att.forEach(a => { c[a.status] = (c[a.status] || 0) + 1; hours += a.hours || 0; });

  const workingDays = company?.workingDays?.length ? company.workingDays : [1, 2, 3, 4, 5, 6];
  const working = workingDaysIn(month, workingDays, company?.holidays || []);
  const { basic = 0, hra = 0, allowances = 0 } = user.salary || {};
  const perDay = working ? (basic + hra + allowances) / working : 0;

  const earnings = { basic: Math.round(basic), hra: Math.round(hra), allowances: Math.round(allowances), overtime: 0 };
  const gross = earnings.basic + earnings.hra + earnings.allowances + earnings.overtime;
  const deductions = {
    pf: Math.round(basic * (company?.pfRate ?? 12) / 100),
    tax: Math.round(gross * (company?.taxRate ?? 5) / 100),
    absent: Math.round(perDay * c.absent),
    unpaidLeave: Math.round(perDay * c.leave * 0.5),
    advance: 0,
  };
  const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
  const net = gross - totalDeductions;

  const existing = await Payslip.findOne({ user: user._id, month });
  const serial = existing?.serial ||
    `PSL-${month.replace('-', '')}-${String((await Payslip.countDocuments({ month })) + 1).padStart(3, '0')}`;

  return Payslip.findOneAndUpdate(
    { user: user._id, month },
    {
      user: user._id, month, monthName: monthName(month), serial,
      earnings, deductions, gross, totalDeductions, net,
      days: { working, ...c, hours: Math.round(hours) },
      status: 'issued', generatedBy: byId,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}