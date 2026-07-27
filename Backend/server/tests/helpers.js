import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';

export const app = createApp();
export const api = () => request(app);

export async function makeCompany(overrides = {}) {
  let ws = await Workspace.findOne({ slug: 'test-ws' });
  if (!ws) ws = new Workspace({ name: 'Test Co', slug: 'test-ws', joinCode: 'TEST01', billing: { status: 'trialing', seats: 10, trialEndsAt: new Date(Date.now() + 14 * 86400000) } });
  Object.assign(ws.settings, {
    currency: 'INR', pfRate: 12, taxRate: 5, workingDays: [1, 2, 3, 4, 5, 6],
    managerName: 'Test Manager', city: 'Mumbai', country: 'India', email: 'hr@test.dev',
  }, overrides);
  await ws.save();
  return ws;
}

export async function makeUser(overrides = {}) {
  const ws = await makeCompany();
  const count = await User.countDocuments();
  const base = {
    name: `Test User ${count + 1}`, email: `u${count + 1}@test.dev`,
    phone: `+91990000${String(count + 1).padStart(4, '0')}`, password: 'Test@123',
    role: 'staff', employeeId: `T-${String(count + 1).padStart(3, '0')}`,
    salary: { basic: 30000, hra: 12000, allowances: 6000 },
    workspace: ws._id, activeWorkspace: ws._id,
  };
  return new User({ ...base, ...overrides }).save();
}

export async function tokenFor(user, password = 'Test@123') {
  const res = await api().post('/api/auth/login').send({ id: user.email, password });
  return res.body.access;
}
