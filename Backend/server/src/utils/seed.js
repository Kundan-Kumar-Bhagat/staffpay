import User from '../models/User.js';
import Workspace, { companyView } from '../models/Workspace.js';
import Attendance from '../models/Attendance.js';
import Invoice from '../models/Invoice.js';
import Voucher from '../models/Voucher.js';
import KioskLog from '../models/KioskLog.js';
import { computeAndSavePayslip } from '../services/payroll.service.js';
import { dstr, prevMonth, currentMonth } from '../utils/helpers.js';
import { runInTenant } from '../utils/tenantContext.js';

export async function seedDemo(force = false) {
  let ws = await Workspace.findOne({ slug: 'northwind' });
  if (!force && ws && (await User.countDocuments({ workspace: ws._id })) > 0) return;
  console.log('◇ Seeding demo data & workspace…');

  if (!ws) {
    ws = new Workspace({
      name: 'Northwind Traders Pvt. Ltd.', slug: 'northwind', joinCode: 'DEMO01', plan: 'pro',
      settings: {
        tagline: 'Distribution & Logistics since 2009',
        address: 'Plot 14, Andheri East Industrial Estate', city: 'Mumbai', state: 'Maharashtra', zip: '400069', country: 'India',
        phone: '+91 22 4890 1122', email: 'hr@northwindtraders.in', website: 'www.northwindtraders.in',
        taxId: '27AABCN4567Q1Z8', pfCode: 'MH/BAN/0045678',
        managerName: 'Priya Sharma', managerTitle: 'Operations Manager',
        currency: 'INR', workStart: '09:30', pfRate: 12, taxRate: 5, workingDays: [1, 2, 3, 4, 5, 6],
        bank: { name: 'HDFC Bank', accountNo: '50200031234567', ifsc: 'HDFC0001234' },
        kiosk: { enabled: true, code: '483921', siteName: 'Warehouse Gate A' },
      },
    });
    await ws.save();
  } else {
    ws.settings.kiosk = { enabled: true, code: '483921', siteName: 'Warehouse Gate A' };
    await ws.save();
  }

  const company = companyView(ws);

  await runInTenant(ws._id, async () => {
    const mk = async u => {
      let userDoc = await User.findOne({ email: u.email }).setOptions({ skipTenant: true });
      if (userDoc) {
        Object.assign(userDoc, u, { workspace: ws._id, activeWorkspace: ws._id });
      } else {
        userDoc = new User({ ...u, workspace: ws._id, activeWorkspace: ws._id });
      }
      await userDoc.save(); // Triggers Mongoose pre('save') hook for bcrypt password hashing
      return userDoc;
    };

    const admin = await mk({ name: 'Aarav Mehta', email: 'admin@staffpay.app', phone: '+919810012345', password: 'Admin@123', role: 'admin', superAdmin: true, employeeId: 'EMP-001', designation: 'Director', department: 'Management', salary: { basic: 120000, hra: 48000, allowances: 30000 }, joinDate: '2019-04-01', bank: { name: 'HDFC Bank', accountNo: '50100223344', ifsc: 'HDFC0001234' }, pan: 'ABCPS1234F', pfNo: 'MH12345678' });
    ws.owner = admin._id;
    await ws.save();

    const manager = await mk({ name: 'Priya Sharma', email: 'manager@staffpay.app', phone: '+919810022334', password: 'Manager@123', role: 'manager', employeeId: 'EMP-002', designation: 'Operations Manager', department: 'Operations', salary: { basic: 72000, hra: 28800, allowances: 16200 }, joinDate: '2020-08-17', bank: { name: 'ICICI Bank', accountNo: '623405001234', ifsc: 'ICIC0006234' }, pan: 'BJXPS9821K', pfNo: 'MH87654321' });

    const staffDefs = [
      ['Rohan Gupta', 'staff@staffpay.app', '+919810033445', 'Staff@123', 'EMP-003', 'Warehouse Supervisor', 'Logistics', { basic: 38000, hra: 15200, allowances: 7800 }],
      ['Sneha Iyer', 'sneha@staffpay.app', '+919810044556', 'Sneha@123', 'EMP-004', 'Accounts Executive', 'Finance', { basic: 42000, hra: 16800, allowances: 8400 }],
      ['Vikram Singh', 'vikram@staffpay.app', '+919810055667', 'Vikram@123', 'EMP-005', 'Delivery Lead', 'Logistics', { basic: 34000, hra: 13600, allowances: 7200 }],
      ['Ananya Rao', 'ananya@staffpay.app', '+919810066778', 'Ananya@123', 'EMP-006', 'HR Executive', 'Human Resources', { basic: 36000, hra: 14400, allowances: 7600 }],
      ['Kabir Khan', 'kabir@staffpay.app', '+919810077889', 'Kabir@123', 'EMP-007', 'Sales Associate', 'Sales', { basic: 30000, hra: 12000, allowances: 6500 }],
    ];

    const staff = [];
    for (const [name, email, phone, password, employeeId, designation, department, salary] of staffDefs) {
      staff.push(await mk({ name, email, phone, password, role: 'staff', employeeId, designation, department, salary, joinDate: '2022-01-10', bank: { name: 'SBI', accountNo: '3098765' + employeeId.slice(4), ifsc: 'SBIN0001234' }, pan: 'AXZP' + employeeId.slice(4) + 'K', pfNo: 'MH' + employeeId.slice(4) + '99' }));
    }

    // Seed Attendance for Previous and Current Month based on workingDays setting
    const months = [prevMonth(currentMonth()), currentMonth()];
    const today = dstr();
    const workingDays = ws.settings.workingDays || [1, 2, 3, 4, 5, 6];

    for (const m of months) {
      const [y, mm] = m.split('-').map(Number);
      const total = new Date(y, mm, 0).getDate();
      for (const u of [manager, ...staff]) {
        for (let d = 1; d <= total; d++) {
          const dt = new Date(y, mm - 1, d);
          const ds = `${m}-${String(d).padStart(2, '0')}`;
          if (ds > today || !workingDays.includes(dt.getDay())) continue;
          const existingAtt = await Attendance.collection.findOne({ user: u._id, date: ds });
          if (existingAtt) continue;

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

    // Seed Payslips
    for (const u of [manager, ...staff]) {
      await computeAndSavePayslip(u, months[0], company, admin._id);
    }

    // Calculate proper 14-day due dates
    const due1 = new Date(); due1.setDate(due1.getDate() + 14);
    const due2 = new Date(); due2.setDate(due2.getDate() + 14);

    // Seed Invoices
    if ((await Invoice.collection.countDocuments({ workspace: ws._id })) === 0) {
      await Invoice.create({
        number: `INV-${new Date().getFullYear()}-001`,
        client: { name: 'Shree Balaji Retailers', email: 'accounts@balajiretail.in', phone: '+91 98220 44556', address: 'Shop 7, LBS Marg, Mulund West, Mumbai 400080', taxId: '27AAACS9876B1Z3' },
        items: [{ description: 'Bulk order supply — FMCG cartons (Q2)', qty: 120, rate: 1850 }, { description: 'Freight & handling', qty: 1, rate: 9400 }],
        taxRate: 18, discount: 5000, issueDate: dstr(), dueDate: dstr(due1),
        notes: 'Payment within 14 days. Goods once dispatched will not be taken back.', status: 'sent', createdBy: admin._id,
      });
      await Invoice.create({
        number: `INV-${new Date().getFullYear()}-002`,
        client: { name: 'Apex Consumer Goods', email: 'billing@apexconsumer.com', phone: '+91 98199 33221', address: 'B-402, Trade Tower, Lower Parel, Mumbai 400013', taxId: '27AAACA1234C1Z9' },
        items: [{ description: 'Monthly Logistics Retainer', qty: 1, rate: 45000 }, { description: 'Express Delivery Surcharge', qty: 5, rate: 3200 }],
        taxRate: 18, discount: 0, issueDate: dstr(), dueDate: dstr(due2),
        notes: 'Thank you for your business.', status: 'paid', createdBy: admin._id,
      });
    }

    // Seed Payment Vouchers
    if ((await Voucher.collection.countDocuments({ workspace: ws._id })) === 0) {
      await Voucher.create({
        number: `PV-${new Date().getFullYear()}-001`,
        payee: { name: 'Ramesh Kumar', phone: '+919000011111', idType: 'Aadhaar', idNumber: '4829-1920-3940' },
        description: 'Casual Labour — Loading & Unloading Shipment #481',
        qty: 4, rate: 750, amount: 3000, net: 3000, paymentMode: 'cash', status: 'paid', createdBy: manager._id, approvedBy: manager._id,
      });
      await Voucher.create({
        number: `PV-${new Date().getFullYear()}-002`,
        payee: { name: 'Suresh Patil', phone: '+919000022222', idType: 'PAN', idNumber: 'BSPPP4821K' },
        description: 'Electrical Maintenance — Warehouse B Breakroom',
        qty: 1, rate: 4200, amount: 4200, deductions: { tds: 420 }, net: 3780, paymentMode: 'upi', status: 'approved', createdBy: manager._id, approvedBy: manager._id,
      });
    }

    // Seed Kiosk Logs
    if ((await KioskLog.collection.countDocuments({ workspace: ws._id })) === 0) {
      await KioskLog.create({
        name: 'Ramesh Kumar', phone: '+919000011111', date: dstr(),
        checkIn: '08:45', checkOut: '17:30', hours: 8.8, status: 'present',
      });
      await KioskLog.create({
        name: 'Sunil Yadav', phone: '+919000033333', date: dstr(),
        checkIn: '09:15', status: 'present',
      });
    }
  });

  console.log('✓ Demo data ready → admin@staffpay.app / Admin@123 | manager@staffpay.app / Manager@123 | staff@staffpay.app / Staff@123');
}