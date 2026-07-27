import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser, tokenFor, makeCompany } from './helpers.js';

beforeAll(setupTestDB); afterAll(teardownTestDB); beforeEach(clearDB);

async function enableKiosk() {
  await makeCompany();
  const admin = await makeUser({ role: 'admin' });
  const t = await tokenFor(admin);
  await api().put('/api/company').set('Authorization', `Bearer ${t}`).send({ kiosk: { enabled: true, siteName: 'Gate 1' } });
  const comp = await api().get('/api/company').set('Authorization', `Bearer ${t}`);
  return comp.body.kiosk.code;
}

describe('gate kiosk', () => {
  it('rejects a bad code and unlocks with the right one', async () => {
    const code = await enableKiosk();
    expect((await api().post('/api/kiosk/unlock').send({ code: '000000' })).status).toBe(401);
    const ok = await api().post('/api/kiosk/unlock').send({ code });
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.siteName).toBe('Gate 1');
  });

  it('records check-in / check-out without any account', async () => {
    const code = await enableKiosk();
    const { body } = await api().post('/api/kiosk/unlock').send({ code });
    const kt = { Authorization: `Bearer ${body.token}` };
    const ci = await api().post('/api/kiosk/checkin').set(kt).send({ phone: '+919000011111', name: 'Ramesh' });
    expect(ci.body.ok).toBe(true);
    const dup = await api().post('/api/kiosk/checkin').set(kt).send({ phone: '+919000011111' });
    expect(dup.status).toBe(400);
    const co = await api().post('/api/kiosk/checkout').set(kt).send({ phone: '+919000011111' });
    expect(co.body.ok).toBe(true);
    const today = await api().get('/api/kiosk/today').set(kt);
    expect(today.body.total).toBe(1);
  });

  it('recognises a returning worker by phone', async () => {
    const code = await enableKiosk();
    const { body } = await api().post('/api/kiosk/unlock').send({ code });
    const kt = { Authorization: `Bearer ${body.token}` };
    await api().post('/api/kiosk/checkin').set(kt).send({ phone: '+919000022222', name: 'Sita' });
    const lk = await api().get('/api/kiosk/lookup').set(kt).query({ phone: '+919000022222' });
    expect(lk.body.name).toBe('Sita');
    expect(lk.body.checkedIn).toBe(true);
  });

  it('keeps /kiosk/logs behind manager auth', async () => {
    const code = await enableKiosk();
    const { body } = await api().post('/api/kiosk/unlock').send({ code });
    expect((await api().get('/api/kiosk/logs').set('Authorization', `Bearer ${body.token}`)).status).toBe(401);
    const admin = await tokenFor(await makeUser({ role: 'admin' }));
    expect((await api().get('/api/kiosk/logs').set('Authorization', `Bearer ${admin}`)).status).toBe(200);
  });
});
