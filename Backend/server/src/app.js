import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import payslipRoutes from './routes/payslip.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import reportRoutes from './routes/report.routes.js';
import companyRoutes from './routes/company.routes.js';
import activityRoutes from './routes/activity.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import notificationRoutes from './routes/notification.routes.js';

export function createApp() {
  const app = express();
  const allowed = (process.env.CLIENT_URL || '')
    .split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || !allowed.length || allowed.includes(origin.replace(/\/+$/, '')) || allowed.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive CORS fallback for multi-domain deployments
      }
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));

  const router = express.Router();
  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/attendance', attendanceRoutes);
  router.use('/payslips', payslipRoutes);
  router.use('/invoices', invoiceRoutes);
  router.use('/reports', reportRoutes);
  router.use('/company', companyRoutes);
  router.use('/activity', activityRoutes);
  router.use('/leave', leaveRoutes);
  router.use('/notification', notificationRoutes);
  router.get('/health', (req, res) => res.json({ ok: true, time: new Date() }));

  app.use('/api', router);
  app.use('/', router);

  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ message: err.message || 'Server error' }); });
  return app;
}
