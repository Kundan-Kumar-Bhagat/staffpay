import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser, tokenFor, makeCompany } from './helpers.js';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearDB);

describe('white-label branding', () => {
  it('uploads a logo and serves it back', async () => {
    await makeCompany();
    const t = await tokenFor(await makeUser({ role: 'admin' }));
    const up = await api().post('/company/logo').set('Authorization', `Bearer ${t}`)
      .attach('logo', PNG, 'logo.png');
    expect(up.status).toBe(200);
    expect(up.body.logoUrl).toMatch(/^\/uploads\/logo-/);
    const served = await api().get(up.body.logoUrl.split('?')[0]);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toContain('image/png');
  });

  it('saves a valid accent and rejects a bad one', async () => {
    await makeCompany();
    const t = await tokenFor(await makeUser({ role: 'admin' }));
    const ok = await api().put('/company').set('Authorization', `Bearer ${t}`)
      .send({ brand: { accent: '#1E3A5F' } });
    expect(ok.status).toBe(200);
    expect(ok.body.brand.accent).toBe('#1E3A5F');
    const bad = await api().put('/company').set('Authorization', `Bearer ${t}`)
      .send({ brand: { accent: 'not-a-color' } });
    expect(bad.status).toBe(400);
  });

  it('resolves tenant brand from the subdomain', async () => {
    await makeCompany(); // slug: test-ws
    const res = await api().get('/public/brand').set('Host', 'test-ws.example.com');
    expect(res.status).toBe(200);
    expect(res.body.whiteLabel).toBe(true);
    expect(res.body.name).toBe('Test Co');
  });
});
