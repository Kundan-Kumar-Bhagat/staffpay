import dotenv from 'dotenv';
dotenv.config();
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { seedDemo } from './utils/seed.js';
import { startJobs } from './jobs/payroll.job.js';
import { startDigestJob } from './jobs/digest.job.js';
import { startTrialJob } from './jobs/trial.job.js';

const start = async () => {
  await connectDB();
  if (process.env.SEED_DEMO === 'true') await seedDemo();
  startJobs();
  startDigestJob();
  startTrialJob();
  const app = createApp();
  app.listen(process.env.PORT || 5000, () => console.log(`▲ StaffPay API running on :${process.env.PORT || 5000}`));
};
start();