import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser, tokenFor, makeCompany } from './helpers.js';
import Workspace from '../src/models/Workspace.js';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearDB);

describe('billing & metering', () => {
  it('reports live usage for the workspace', async () => {
    await makeCompany();
    const admin = await makeUser({ role: 'admin' });
    await makeUser(); await makeUser();
    const res = await api().get('/billing/usage').set('Authorization', `Bearer ${await tokenFor(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.staff).toBe(3);
    expect(res.body.plan).toBe('trial');
    expect(res.body.trialDaysLeft).toBeGreaterThan(0);
  });

  it('simulated checkout upgrades the workspace to Pro', async () => {
    await makeCompany();
    const admin = await makeUser({ role: 'admin' });
    const t = await tokenFor(admin);
    const co = await api().post('/billing/checkout').set('Authorization', `Bearer ${t}`);
    expect(co.status).toBe(200);
    expect(co.body.demo).toBe(true);                    // no Stripe keys in tests
    const ws = await Workspace.findOne({ slug: 'test-ws' });
    expect(ws.plan).toBe('pro');
    expect(ws.billing.status).toBe('demo');
  });

  it('trial workspaces hit the 10-seat wall', async () => {
    await makeCompany();
    const admin = await makeUser({ role: 'admin' });
    const t = await tokenFor(admin);
    for (let i = 0; i < 9; i++) await makeUser();       // admin + 9 = 10 seats
    const res = await api().post('/api/users' === '/' ? '' : '/users').set('Authorization', `Bearer ${t}`)
      .send({ name: 'One Too Many', email: 'over@cap.dev' });
    expect(res.status).toBe(402);
    expect(res.body.message).toContain('caps at 10');
  });

  it('seat control is Pro-only', async () => {
    await makeCompany();
    const admin = await makeUser({ role: 'admin' });
    const res = await api().put('/billing/seats').set('Authorization', `Bearer ${await tokenFor(admin)}`)
      .send({ seats: 25 });
    expect(res.status).toBe(402);
  });
});
