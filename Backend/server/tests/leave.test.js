import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser, tokenFor, makeCompany } from './helpers.js';
import Attendance from '../src/models/Attendance.js';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearDB);

describe('leave workflow', () => {
  it('apply → approve → attendance is marked as leave', async () => {
    await makeCompany();
    const mgr = await makeUser({ role: 'manager' });
    const staff = await makeUser();
    const st = await tokenFor(staff), mt = await tokenFor(mgr);

    const apply = await api().post('/api/leave').set('Authorization', `Bearer ${st}`)
      .send({ from: '2026-08-03', to: '2026-08-04', type: 'casual', reason: 'Family function' });
    expect(apply.status).toBe(201);
    expect(apply.body.status).toBe('pending');
    expect(apply.body.days).toBe(2);

    const dec = await api().put(`/api/leave/${apply.body._id}/decide`)
      .set('Authorization', `Bearer ${mt}`).send({ status: 'approved' });
    expect(dec.status).toBe(200);

    const rec = await Attendance.findOne({ user: staff._id, date: '2026-08-03' });
    expect(rec.status).toBe('leave');
  });

  it('enforces the annual quota', async () => {
    await makeCompany(); // casual quota 12
    const st = await tokenFor(await makeUser());
    const res = await api().post('/api/leave').set('Authorization', `Bearer ${st}`)
      .send({ from: '2026-09-01', to: '2026-09-13', type: 'casual' }); // 13 days
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Not enough casual leave');
  });

  it('reports balances per type', async () => {
    await makeCompany();
    const st = await tokenFor(await makeUser());
    const res = await api().get('/api/leave/balance').set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(200);
    const casual = res.body.find(b => b.type === 'casual');
    expect(casual.quota).toBe(12);
    expect(casual.left).toBe(12);
  });
});
