import User from '../models/User.js';
import Company from '../models/Company.js';
import Attendance from '../models/Attendance.js';
import Invoice from '../models/Invoice.js';
import { computeAndSavePayslip } from '../services/payroll.service.js';
import { dstr, prevMonth, currentMonth } from '../utils/helpers.js';

export async function seedDemo() {
  if ((await User.countDocuments()) > 0) return;
  console.log('◇ Seeding demo data…');

  const company = await Company.create({
    name: 'Northwind Traders Pvt. Ltd.', tagline: 'Distribution & Logistics since 2009',
    address: 'Plot 14, Andheri East Industrial Estate', city: 'Mumbai', state: 'Maharashtra', zip: '400069', country: 'India',
    phone: '+91 22 4890 1122', email: 'hr@northwindtraders.in', website: 'www.northwindtraders.in',
    taxId: '27AABCN4567Q1Z8', pfCode: 'MH/BAN/0045678',
    managerName: 'Priya Sharma', managerTitle: 'Operations Manager',
    currency: 'INR', workStart: '09:30', pfRate: 12, taxRate: 5, workingDays: [1, 2, 3, 4, 5, 6],
    bank: { name: 'HDFC Bank', accountNo: '50200031234567', ifsc: 'HDFC0001234' },
  });

  const mk = u => new User(u).save();
  const admin = await mk({ name: 'Aarav Mehta', email: 'admin@staffpay.app', phone: '+919810012345', password: 'Admin@123', role: 'admin', employeeId: 'EMP-001', designation: 'Director', department: 'Management', salary: { basic: 120000, hra: 48000, allowances: 30000 }, joinDate: '2019-04-01', bank: { name: 'HDFC Bank', accountNo: '50100223344', ifsc: 'HDFC0001234' }, pan: 'ABCPS1234F', pfNo: 'MH12345678' });
  const manager = await mk({ name: 'Priya Sharma', email: 'manager@staffpay.app', phone: '+919810022334', password: 'Manager@123', role: 'manager', employeeId: 'EMP-002', designation: 'Operations Manager', department: 'Operations', salary: { basic: 72000, hra: 28800, allowances: 16200 }, joinDate: '2020-08-17', bank: { name: 'ICICI Bank', accountNo: '623405001234', ifsc: 'ICIC0006234' }, pan: 'BJXPS9821K', pfNo: 'MH87654321' });
  const staffDefs = [
    ['Rohan Gupta', 'staff@staffpay.app', '+919810033445', 'Staff@123', 'EMP-003', 'Warehouse Supervisor', 'Logistics', { basic: 38000, hra: 15200, allowances: 7800 }],
    ['Sneha Iyer', 'sneha@staffpay.app', '+919810044556', 'Sneha@123', 'EMP-004', 'Accounts Executive', 'Finance', { basic: 42000, hra: 16800, allowances: 8400 }],
    ['Vikram Singh', 'vikram@staffpay.app', '+919810055667', 'Vikram@123', 'EMP-005', 'Delivery Lead', 'Logistics', { basic: 34000, hra: 13600, allowances: 7200 }],
    ['Ananya Rao', 'ananya@staffpay.app', '+919810066778', 'Ananya@123', 'EMP-006', 'HR Executive', 'Human Resources', { basic: 36000, hra: 14400, allowances: 7600 }],
    ['Kabir Khan', 'kabir@staffpay.app', '+919810077889', 'Kabir@123', 'EMP-007', 'Sales Associate', 'Sales', { basic: 30000, hra: 12000, allowances: 6500 }],
  ];
  const staff = [];
  for (const [name, email, phone, password, employeeId, designation, department, salary] of staffDefs)
    staff.push(await mk({ name, email, phone, password, role: 'staff', employeeId, designation, department, salary, joinDate: '2022-01-10', bank: { name: 'SBI', accountNo: '3098765' + employeeId.slice(4), ifsc: 'SBIN0001234' }, pan: 'AXZP' + employeeId.slice(4) + 'K', pfNo: 'MH' + employeeId.slice(4) + '99' }));

  const months = [prevMonth(currentMonth()), currentMonth()];
  const today = dstr();
  for (const m of months) {
    const [y, mm] = m.split('-').map(Number);
    const total = new Date(y, mm, 0).getDate();
    for (const u of [manager, ...staff]) {
      for (let d = 1; d <= total; d++) {
        const dt = new Date(y, mm - 1, d);
        const ds = `${m}-${String(d).padStart(2, '0')}`;
        if (ds > today || dt.getDay() === 0) continue;
        const r = Math.random();
        let status = 'present';
        if (r > 0.94) status = 'absent'; else if (r > 0.88) status = 'leave'; else if (r > 0.80) status = 'late'; else if (r > 0.75) status = 'half';
        if (status === 'absent' || status === 'leave') { await Attendance.create({ user: u._id, date: ds, status, markedBy: manager._id }); continue; }
        const inH = status === 'late' ? 10 : 9, outH = status === 'half' ? 13 : 18;
        const checkIn = `${String(inH).padStart(2, '0')}:${String(Math.floor(Math.random() * 50)).padStart(2, '0')}`;
        const checkOut = `${String(outH).padStart(2, '0')}:${String(Math.floor(Math.random() * 50)).padStart(2, '0')}`;
        await Attendance.create({ user: u._id, date: ds, checkIn, checkOut, status, hours: +(outH - inH).toFixed(1), markedBy: manager._id });
      }
    }
  }

  for (const u of [manager, ...staff]) await computeAndSavePayslip(u, months[0], company, admin._id);

  await Invoice.create({
    number: `INV-${new Date().getFullYear()}-001`,
    client: { name: 'Shree Balaji Retailers', email: 'accounts@balajiretail.in', phone: '+91 98220 44556', address: 'Shop 7, LBS Marg, Mulund West, Mumbai 400080', taxId: '27AAACS9876B1Z3' },
    items: [{ description: 'Bulk order supply — FMCG cartons (Q2)', qty: 120, rate: 1850 }, { description: 'Freight & handling', qty: 1, rate: 9400 }],
    taxRate: 18, discount: 5000, issueDate: dstr(), dueDate: `${dstr().slice(0, 8)}${Math.min(28, +dstr().slice(8) + 14)}`,
    notes: 'Payment within 14 days. Goods once dispatched will not be taken back.', status: 'sent', createdBy: admin._id,
  });

  console.log('✓ Demo data ready → admin@staffpay.app / Admin@123');
}