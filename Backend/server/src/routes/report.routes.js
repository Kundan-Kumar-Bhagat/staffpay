import { Router } from 'express';
import * as c from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Payslip from '../models/Payslip.js';
import Invoice from '../models/Invoice.js';
import Leave from '../models/Leave.js';
import Company from '../models/Company.js';
import { attendanceXLSX } from '../services/excel.service.js';
import { currentMonth, dstr } from '../utils/helpers.js';
import { buildDigest, sendDigest } from '../jobs/digest.job.js';

const r = Router();
r.use(protect, authorize('admin', 'manager'));
r.get('/summary', c.summary);
r.get('/daily', c.daily);
r.get('/trend', c.trend);
r.get('/staff', c.staffMonth);
r.get('/attendance-xlsx', async (req, res) => {
  const month = req.query.month || currentMonth();
  const rows = await Attendance.find({ date: { $regex: `^${month}` } }).populate('user', 'name employeeId designation').sort('date');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${month}.xlsx"`);
  res.send(await attendanceXLSX(rows, month));
});

r.get('/digest-preview', async (req, res) => res.json(await buildDigest()));
r.post('/digest-send', async (req, res) => res.json(await sendDigest()));

r.get('/backup', protect, authorize('admin'), async (req, res) => {
  const [users, attendance, payslips, invoices, leaves, company] = await Promise.all([
    User.find().select('-password'),
    Attendance.find(), Payslip.find(), Invoice.find(), Leave.find(),
    Company.findOne(),
  ]);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="staffpay-backup-${dstr().replaceAll('-', '')}.json"`);
  res.json({ exportedAt: new Date(), company, users, attendance, payslips, invoices, leaves });
});

export default r;