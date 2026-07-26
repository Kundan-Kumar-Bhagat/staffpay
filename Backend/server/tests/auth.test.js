import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser } from './helpers.js';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearDB);

describe('auth', () => {
  it('registers and returns access + refresh tokens', async () => {
    const res = await api().post('/api/auth/register')
      .send({ name: 'First', email: 'first@test.dev', password: 'Pass@123' });
    expect(res.status).toBe(201);
    expect(res.body.access).toBeTruthy();
    expect(res.body.refresh).toBeTruthy();
    expect(res.body.user.email).toBe('first@test.dev');
  });

  it('makes the very first account an admin', async () => {
    const res = await api().post('/api/auth/register')
      .send({ name: 'First', email: 'a@test.dev', password: 'Pass@123' });
    expect(res.body.user.role).toBe('admin');
  });

  it('rejects duplicate email', async () => {
    await makeUser({ email: 'dup@test.dev' });
    const res = await api().post('/api/auth/register')
      .send({ name: 'X', email: 'dup@test.dev', password: 'Pass@123' });
    expect(res.status).toBe(409);
  });

  it('rejects a wrong password', async () => {
    await makeUser({ email: 'w@test.dev' });
    const res = await api().post('/api/auth/login').send({ id: 'w@test.dev', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('refresh token issues a fresh access token', async () => {
    const u = await makeUser();
    const login = await api().post('/api/auth/login').send({ id: u.email, password: 'Test@123' });
    const res = await api().post('/api/auth/refresh').send({ refresh: login.body.refresh });
    expect(res.status).toBe(200);
    expect(res.body.access).toBeTruthy();
  });

  it('phone OTP flow: request → verify → session', async () => {
    const req = await api().post('/api/auth/phone/request').send({ phone: '+919999888877' });
    expect(req.status).toBe(200);
    const res = await api().post('/api/auth/phone/verify')
      .send({ phone: '+919999888877', otp: req.body.devOtp });
    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe('+919999888877');
  });

  it('rejects a wrong OTP', async () => {
    await api().post('/api/auth/phone/request').send({ phone: '+919999888877' });
    const res = await api().post('/api/auth/phone/verify')
      .send({ phone: '+919999888877', otp: '000000' });
    expect(res.status).toBe(400);
  });
});
