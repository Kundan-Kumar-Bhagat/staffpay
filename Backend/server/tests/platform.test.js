import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser, tokenFor, makeCompany } from './helpers.js';

beforeAll(setupTestDB); afterAll(teardownTestDB); beforeEach(clearDB);

describe('platform operator console', () => {
  it('rejects non-superadmin users from platform stats', async () => {
    await makeCompany();
    const admin = await makeUser({ role: 'admin', superAdmin: false });
    const t = await tokenFor(admin);
    const res = await api().get('/api/platform/stats').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(403);
  });

  it('provides platform stats and lists workspaces for superadmins', async () => {
    await makeCompany();
    const superAdmin = await makeUser({ role: 'admin', superAdmin: true });
    const t = await tokenFor(superAdmin);

    const statsRes = await api().get('/api/platform/stats').set('Authorization', `Bearer ${t}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.workspaces).toBeGreaterThan(0);

    const wsRes = await api().get('/api/platform/workspaces').set('Authorization', `Bearer ${t}`);
    expect(wsRes.status).toBe(200);
    expect(Array.isArray(wsRes.body)).toBe(true);
  });

  it('allows impersonating and exiting customer workspaces', async () => {
    const ws1 = await makeCompany({ name: 'Co One', slug: 'co-one' });
    const superAdmin = await makeUser({ role: 'admin', superAdmin: true, workspace: ws1._id, activeWorkspace: ws1._id });
    const t = await tokenFor(superAdmin);

    const impRes = await api().post(`/api/platform/workspaces/${ws1._id}/impersonate`).set('Authorization', `Bearer ${t}`);
    expect(impRes.status).toBe(200);
    expect(impRes.body.user.impersonating).toBe(true);

    const exitRes = await api().post('/api/platform/exit-impersonation').set('Authorization', `Bearer ${t}`);
    expect(exitRes.status).toBe(200);
    expect(exitRes.body.user.impersonating).toBe(false);
  });
});
