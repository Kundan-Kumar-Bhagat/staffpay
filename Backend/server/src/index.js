import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import rateLimit from 'express-rate-limit';
import activityRoutes from './routes/activity.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import notificationRoutes from './routes/notification.routes.js';

import payslipRoutes from './routes/payslip.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import reportRoutes from './routes/report.routes.js';
import companyRoutes from './routes/company.routes.js';
import { seedDemo } from './utils/seed.js';
import { startJobs } from './jobs/payroll.job.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));


app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true }), authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/activity', activityRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ message: err.message || 'Server error' }); });

const start = async () => {
  await connectDB();
  if (process.env.SEED_DEMO === 'true') await seedDemo();
  startJobs();
  app.listen(process.env.PORT || 5000, () => console.log(`▲ StaffPay API running on :${process.env.PORT || 5000}`));
};
start();