import Company from '../models/Company.js';

const DEFAULTS = {
  name: 'Your Company Pvt. Ltd.', tagline: 'Attendance & Payroll', address: '12 Business Park', city: 'Mumbai',
  state: 'Maharashtra', zip: '400001', country: 'India', phone: '+91 98000 00000', email: 'hr@company.com',
  taxId: '', pfCode: '', managerName: '', managerTitle: 'Operations Manager', currency: 'INR',
};

export const get = async (req, res) => {
  const c = await Company.findOne();
  res.json(c || DEFAULTS);
};

export const update = async (req, res) => {
  let c = await Company.findOne();
  if (!c) c = new Company();
  Object.assign(c, req.body);
  await c.save();
  res.json(c);
};