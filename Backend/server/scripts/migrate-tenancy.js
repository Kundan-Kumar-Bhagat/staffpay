import dotenv from 'dotenv'; dotenv.config();
import { connectDB } from '../src/config/db.js';
import Workspace from '../src/models/Workspace.js';
import Company from '../src/models/Company.js';
import User from '../src/models/User.js';
import Attendance from '../src/models/Attendance.js';
import Payslip from '../src/models/Payslip.js';
import Invoice from '../src/models/Invoice.js';
import Leave from '../src/models/Leave.js';
import Notification from '../src/models/Notification.js';
import Activity from '../src/models/Activity.js';

const run = async () => {
  await connectDB();
  let ws = await Workspace.findOne({ slug: 'default' });
  if (!ws) {
    const legacy = await Company.findOne();
    ws = await Workspace.create({
      name: legacy?.name || 'Default Workspace', slug: 'default', joinCode: 'DFLT01', plan: 'pro',
      settings: legacy ? legacy.toObject() : {},
    });
    console.log('✓ Created workspace:', ws.name);
  }
  const u = await User.updateMany({ workspace: { $exists: false } }, { $set: { workspace: ws._id, activeWorkspace: ws._id } });
  console.log(`✓ Users: stamped ${u.modifiedCount}`);
  for (const M of [Attendance, Payslip, Invoice, Leave, Notification, Activity]) {
    const r = await M.updateMany({ workspace: { $exists: false } }, { $set: { workspace: ws._id } });
    console.log(`✓ ${M.modelName}: stamped ${r.modifiedCount}`);
  }
  console.log('✓ Tenancy migration complete');
  process.exit(0);
};
run();
