import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearDB } from './setup.js';
import { api, makeUser, tokenFor, makeCompany } from './helpers.js';
import { dstr } from '../src/utils/helpers.js';
import Attendance from '../src/models/Attendance.js';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
beforeEach(clearDB);

describe('attendance', () => {
  it('check-in creates a record, second check-in is rejected', async () => {
    const t = await tokenFor(await makeUser());
    const first = await api().post('/api/attendance/checkin').set('Authorization', `Bearer ${t}`);
    expect(first.status).toBe(200);
    expect(['present', 'late']).toContain(first.body.record.status);
    const second = await api().post('/api/attendance/checkin').set('Authorization', `Bearer ${t}`);
    expect(second.status).toBe(400);
  });

  it('check-out stamps time and hours', async () => {
    const t = await tokenFor(await makeUser());
    await api().post('/api/attendance/checkin').set('Authorization', `Bearer ${t}`);
    const out = await api().post('/api/attendance/checkout').set('Authorization', `Bearer ${t}`);
    expect(out.status).toBe(200);
    expect(out.body.record.checkOut).toBeTruthy();
    expect(out.body.record.hours).toBeGreaterThanOrEqual(0);
  });

  it('manager bulk-mark writes statuses for the day', async () => {
    await makeCompany();
    const mgr = await tokenFor(await makeUser({ role: 'manager' }));
    const s1 = await makeUser(), s2 = await makeUser();
    const res = await api().post('/api/attendance/mark').set('Authorization', `Bearer ${mgr}`)
      .send({ date: dstr(), entries: [
        { userId: s1._id, status: 'present' },
        { userId: s2._id, status: 'absent', note: 'no call no show' },
      ]});
    expect(res.status).toBe(200);
    const rec = await Attendance.findOne({ user: s2._id, date: dstr() });
    expect(rec.status).toBe('absent');
    expect(rec.note).toBe('no call no show');
  });

  it('staff only ever see their own register', async () => {
    await makeCompany();
    const mgr = await tokenFor(await makeUser({ role: 'manager' }));
    const s1 = await makeUser(), s2 = await makeUser();
    await api().post('/api/attendance/mark').set('Authorization', `Bearer ${mgr}`)
      .send({ date: dstr(), entries: [
        { userId: s1._id, status: 'present' }, { userId: s2._id, status: 'late' },
      ]});
    const own = await api().get(`/api/attendance?date=${dstr()}`)
      .set('Authorization', `Bearer ${await tokenFor(s1)}`);
    expect(own.body.length).toBe(1);
    expect(own.body[0].user._id).toBe(String(s1._id));
  });
});
