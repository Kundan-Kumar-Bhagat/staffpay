import Payslip from '../models/Payslip.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import { computeAndSavePayslip } from '../services/payroll.service.js';
import { payslipPDF, pdfBuffer } from '../services/pdf.service.js';
import { payslipXLSX } from '../services/excel.service.js';
import { currentMonth, fmtMoney } from '../utils/helpers.js';
import { sendMail } from '../services/mail.service.js';
import { logActivity } from '../utils/log.js';
import { notify } from '../utils/notify.js';

export const generate = async (req, res) => {
  const { userId, month = currentMonth(), earnings, deductions, days } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'Staff member not found' });
  const company = req.company;
  const customOverrides = (earnings || deductions || days) ? { earnings, deductions, days } : null;
  const slip = await computeAndSavePayslip(user, month, company, req.user._id, customOverrides);
  logActivity(req.user, 'payslip', `generated payslip ${slip.serial} for ${user.name}`);
  notify(user, 'payslip', 'Payslip issued', `Your payslip ${slip.serial} for ${slip.monthName} is ready — net ${fmtMoney(slip.net, company.currency)}.`, '/payslips');
  res.json(slip);
};

export const generateAll = async (req, res) => {
  const { month = currentMonth() } = req.body;
  const company = req.company;
  const users = await User.find({ status: 'active', role: { $in: ['staff', 'manager'] } });
  const slips = [];
  for (const u of users) {
    const slip = await computeAndSavePayslip(u, month, company, req.user._id);
    slips.push(slip);
    notify(u, 'payslip', 'Payslip issued', `Your payslip ${slip.serial} for ${slip.monthName} is ready — net ${fmtMoney(slip.net, company.currency)}.`, '/payslips');
  }
  logActivity(req.user, 'payslip', `ran bulk payroll for ${slips.length} staff (${month})`);
  res.json({ message: `Generated ${slips.length} payslips for ${month}`, slips });
};

export const list = async (req, res) => {
  const filter = {};
  if (req.user.role === 'staff') filter.user = req.user._id;
  if (req.query.month) filter.month = req.query.month;
  res.json(await Payslip.find(filter).populate('user', 'name employeeId designation department').sort({ month: -1, createdAt: -1 }));
};

const loadSlip = async (req, res) => {
  const p = await Payslip.findById(req.params.id).populate('user');
  if (!p) { res.status(404).json({ message: 'Payslip not found' }); return null; }
  if (req.user.role === 'staff' && String(p.user._id) !== String(req.user._id)) { res.status(403).json({ message: 'Forbidden' }); return null; }
  return p;
};

export const getOne = async (req, res) => { const p = await loadSlip(req, res); if (p) res.json(p); };

export const pdf = async (req, res) => {
  const p = await loadSlip(req, res); if (!p) return;
  const company = req.company;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${p.serial}.pdf"`);
  payslipPDF(p, company, p.user).pipe(res);
};

export const xlsx = async (req, res) => {
  const p = await loadSlip(req, res); if (!p) return;
  const company = req.company;
  const buf = await payslipXLSX(p, company, p.user);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${p.serial}.xlsx"`);
  res.send(buf);
};

export const remove = async (req, res) => {
  await Payslip.findByIdAndDelete(req.params.id);
  res.json({ message: 'Payslip deleted' });
};

export const emailSlip = async (req, res) => {
  const p = await loadSlip(req, res); if (!p) return;
  const company = req.company;
  const to = req.body.to || p.user.email;
  if (!to) return res.status(400).json({ message: 'No recipient — add an email to the staff record or pass { "to": "…" }' });
  const pdf = await pdfBuffer(payslipPDF(p, company, p.user));
  const sent = await sendMail({
    to,
    subject: `Your payslip for ${p.monthName} — ${company.name}`,
    text: `Hi ${p.user.name},\n\nPlease find attached your payslip (${p.serial}) for ${p.monthName}.\nNet pay: ${fmtMoney(p.net, company.currency)}.\n\nRegards,\n${company.managerName || 'HR'} — ${company.name}`,
    attachments: [{ filename: `${p.serial}.pdf`, content: pdf }],
  });
  res.json({ message: sent ? `Payslip emailed to ${to}` : 'SMTP not configured — add SMTP_* keys in server/.env' });
};

export const verify = async (req, res) => {
  const serial = (req.params.serial || '').trim();
  const safe = serial.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const p = await Payslip.findOne({ serial: { $regex: `^${safe}$`, $options: 'i' } })
    .populate('user', 'name employeeId designation department');
  if (!p) return res.status(404).json({ valid: false, message: 'No payslip found with this number. Check the slip no. and try again.' });
  const ws = await Workspace.findById(p.workspace);
  const name = p.user?.name || '';
  res.json({
    valid: true,
    serial: p.serial,
    company: ws?.name || '—',
    brand: { logoUrl: ws?.settings?.brand?.logoUrl, accent: ws?.settings?.brand?.accent },
    month: p.monthName,
    employee: name ? `${name[0]}${'*'.repeat(Math.min(6, Math.max(3, name.length - 1)))}` : '—',
    employeeId: p.user?.employeeId,
    designation: p.user?.designation,
    net: String(p.net),
    issuedAt: p.updatedAt || p.createdAt,
  });
};