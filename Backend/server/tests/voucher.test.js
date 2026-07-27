import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser, tokenFor, makeCompany } from './helpers.js';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearDB);

describe('voucher workflow & disbursement', () => {
  it('creates, approves, and marks voucher as paid', async () => {
    await makeCompany();
    const mgr = await makeUser({ role: 'manager' });
    const t = await tokenFor(mgr);

    const createRes = await api().post('/api/vouchers').set('Authorization', `Bearer ${t}`).send({
      payee: { name: 'Ramesh Kumar', phone: '+919876543210', email: 'ramesh@test.dev' },
      description: 'Site electrical work', amount: 1500, paymentMode: 'cash',
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('draft');

    const appRes = await api().put(`/api/vouchers/${createRes.body._id}/approve`).set('Authorization', `Bearer ${t}`);
    expect(appRes.body.status).toBe('approved');

    const paidRes = await api().put(`/api/vouchers/${createRes.body._id}/paid`).set('Authorization', `Bearer ${t}`);
    expect(paidRes.body.status).toBe('paid');
  });

  it('builds a disbursement sheet with correct totals', async () => {
    await makeCompany();
    const mgr = await makeUser({ role: 'manager' });
    const t = await tokenFor(mgr);
    await api().post('/api/vouchers').set('Authorization', `Bearer ${t}`).send({ payee: { name: 'A' }, description: 'Labour', amount: 1000, paymentMode: 'cash', issue: true });
    await api().post('/api/vouchers').set('Authorization', `Bearer ${t}`).send({ payee: { name: 'B' }, description: 'Transport', amount: 500, paymentMode: 'upi', issue: true });
    const res = await api().get('/api/vouchers/disbursement').set('Authorization', `Bearer ${t}`);
    expect(res.body.count).toBe(2);
    expect(res.body.total).toBe(1500);
    expect(res.body.byMode.cash).toBe(1000);
    expect(res.body.byMode.upi).toBe(500);
    const pdf = await api().get('/api/vouchers/disbursement/pdf').set('Authorization', `Bearer ${t}`);
    expect(pdf.headers['content-type']).toContain('application/pdf');
  });

  it('auto-notifies on payment and supports explicit delivery', async () => {
    await makeCompany();
    const mgr = await makeUser({ role: 'manager' });
    const t = await tokenFor(mgr);
    const v = await api().post('/api/vouchers').set('Authorization', `Bearer ${t}`).send({
      payee: { name: 'Ramesh', phone: '+919000022222' }, description: 'Labour', amount: 800, issue: true,
    });
    const paid = await api().put(`/api/vouchers/${v.body._id}/paid`).set('Authorization', `Bearer ${t}`);
    expect(paid.body.status).toBe('paid');
    const wa = await api().post(`/api/vouchers/${v.body._id}/deliver`).set('Authorization', `Bearer ${t}`).send({ channel: 'whatsapp' });
    expect(wa.status).toBe(200);
    expect(wa.body.ok).toBe(false);                 // no WA keys in tests — graceful fallback
    const noPhone = await api().post('/api/vouchers').set('Authorization', `Bearer ${t}`).send({ payee: { name: 'NoPhone' }, description: 'X', amount: 100, issue: true });
    const fail = await api().post(`/api/vouchers/${noPhone.body._id}/deliver`).set('Authorization', `Bearer ${t}`).send({ channel: 'whatsapp' });
    expect(fail.status).toBe(400);
  });
});
