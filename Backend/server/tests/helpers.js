import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import Company from '../src/models/Company.js';

export const app = createApp();
export const api = () => request(app);

export async function makeUser(overrides = {}) {
  const count = await User.countDocuments();
  const base = {
    name: `Test User ${count + 1}`,
    email: `u${count + 1}@test.dev`,
    phone: `+91990000${String(count + 1).padStart(4, '0')}`,
    password: 'Test@123',
    role: 'staff',
    employeeId: `T-${String(count + 1).padStart(3, '0')}`,
    salary: { basic: 30000, hra: 12000, allowances: 6000 },
  };
  return new User({ ...base, ...overrides }).save();
}

export async function tokenFor(user, password = 'Test@123') {
  const res = await api().post('/api/auth/login').send({ id: user.email, password });
  return res.body.access;
}

export async function makeCompany(overrides = {}) {
  let c = await Company.findOne();
  if (!c) c = new Company();
  Object.assign(c, {
    name: 'Test Co', currency: 'INR', pfRate: 12, taxRate: 5,
    workingDays: [1, 2, 3, 4, 5, 6], managerName: 'Test Manager',
    city: 'Mumbai', country: 'India', email: 'hr@test.dev',
  }, overrides);
  await c.save();
  return c;
}
