import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser, tokenFor, makeCompany } from './helpers.js';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearDB);

describe('role-based access control', () => {
  it('rejects unauthenticated requests', async () => {
    expect((await api().get('/api/users')).status).toBe(401);
    expect((await api().get('/api/reports/summary')).status).toBe(401);
  });

  it('staff cannot list users, mark attendance, or open reports', async () => {
    const t = await tokenFor(await makeUser());
    expect((await api().get('/api/users').set('Authorization', `Bearer ${t}`)).status).toBe(403);
    expect((await api().post('/api/attendance/mark').set('Authorization', `Bearer ${t}`)
      .send({ date: '2026-07-01', entries: [] })).status).toBe(403);
    expect((await api().get('/api/reports/summary').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  });

  it('manager can list users but cannot create them', async () => {
    const t = await tokenFor(await makeUser({ role: 'manager' }));
    expect((await api().get('/api/users').set('Authorization', `Bearer ${t}`)).status).toBe(200);
    expect((await api().post('/api/users').set('Authorization', `Bearer ${t}`)
      .send({ name: 'Nope' })).status).toBe(403);
  });

  it('admin can create users', async () => {
    const t = await tokenFor(await makeUser({ role: 'admin' }));
    const res = await api().post('/api/users').set('Authorization', `Bearer ${t}`)
      .send({ name: 'New Hire', email: 'hire@test.dev', role: 'staff' });
    expect(res.status).toBe(201);
    expect(res.body.employeeId).toMatch(/^EMP-/);
  });

  it('staff cannot generate payslips', async () => {
    await makeCompany();
    const t = await tokenFor(await makeUser());
    const res = await api().post('/api/payslips/generate').set('Authorization', `Bearer ${t}`)
      .send({ userId: 'aaaaaaaaaaaaaaaaaaaaaaaa', month: '2026-06' });
    expect(res.status).toBe(403);
  });
});
