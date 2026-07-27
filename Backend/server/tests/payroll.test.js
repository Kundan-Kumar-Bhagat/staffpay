import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser, tokenFor, makeCompany } from './helpers.js';
import Attendance from '../src/models/Attendance.js';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearDB);

import { runInTenant } from '../src/utils/tenantContext.js';

// June 2026: Sundays fall on 7/14/21/28 → 26 working days (Mon–Sat)
const MONTH = '2026-06';
async function seedMonth(staff, markedBy) {
  let idx = 0;
  await runInTenant(staff.workspace, async () => {
    for (let d = 1; d <= 30; d++) {
      const dt = new Date(2026, 5, d);
      if (dt.getDay() === 0) continue;
      const status = idx < 22 ? 'present' : idx < 24 ? 'late' : idx < 25 ? 'half' : 'leave';
      await Attendance.create({
        user: staff._id, date: `${MONTH}-${String(d).padStart(2, '0')}`,
        checkIn: '09:10', checkOut: '18:05', status, hours: 8.9, markedBy,
      });
      idx++;
    }
  });
}

describe('payroll engine', () => {
  it('computes gross, deductions and net exactly', async () => {
    await makeCompany(); // pfRate 12, taxRate 5
    const admin = await makeUser({ role: 'admin' });
    const staff = await makeUser({ salary: { basic: 30000, hra: 12000, allowances: 6000 } });
    await seedMonth(staff, admin._id);
    const t = await tokenFor(admin);

    const gen = await api().post('/api/payslips/generate').set('Authorization', `Bearer ${t}`)
      .send({ userId: String(staff._id), month: MONTH });
    expect(gen.status).toBe(200);
    const p = gen.body;

    expect(p.gross).toBe(48000);                       // 30k + 12k + 6k
    expect(p.deductions.pf).toBe(3600);                // 12% of basic
    expect(p.deductions.tax).toBe(2400);               // 5% of gross
    expect(p.deductions.unpaidLeave).toBe(923);        // (48000/26) × 1 leave day × 0.5
    expect(p.totalDeductions).toBe(6923);
    expect(p.net).toBe(41077);                         // 48000 − 6923
    expect(p.days.working).toBe(26);
    expect(p.serial).toMatch(/^PSL-202606-/);
  });

  it('serves the payslip as a real PDF', async () => {
    await makeCompany();
    const admin = await makeUser({ role: 'admin' });
    const staff = await makeUser();
    await seedMonth(staff, admin._id);
    const t = await tokenFor(admin);
    const gen = await api().post('/api/payslips/generate').set('Authorization', `Bearer ${t}`)
      .send({ userId: String(staff._id), month: MONTH });
    const pdf = await api().get(`/api/payslips/${gen.body._id}/pdf`).set('Authorization', `Bearer ${t}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('blocks staff from reading someone else\'s payslip', async () => {
    await makeCompany();
    const admin = await makeUser({ role: 'admin' });
    const s1 = await makeUser(), s2 = await makeUser();
    await seedMonth(s1, admin._id);
    const t = await tokenFor(admin);
    const gen = await api().post('/api/payslips/generate').set('Authorization', `Bearer ${t}`)
      .send({ userId: String(s1._id), month: MONTH });
    const peek = await api().get(`/api/payslips/${gen.body._id}`)
      .set('Authorization', `Bearer ${await tokenFor(s2)}`);
    expect(peek.status).toBe(403);
  });

  it('verification portal confirms real slips and rejects fakes', async () => {
    await makeCompany();
    const admin = await makeUser({ role: 'admin' });
    const staff = await makeUser();
    await seedMonth(staff, admin._id);
    const t = await tokenFor(admin);
    const gen = await api().post('/api/payslips/generate').set('Authorization', `Bearer ${t}`)
      .send({ userId: String(staff._id), month: MONTH });

    const ok = await api().get(`/api/payslips/verify/${gen.body.serial}`);   // public
    expect(ok.status).toBe(200);
    expect(ok.body.valid).toBe(true);
    expect(ok.body.net).toBe('41077');

    const bad = await api().get('/api/payslips/verify/PSL-000000-999');
    expect(bad.status).toBe(404);
    expect(bad.body.valid).toBe(false);
  });
});
