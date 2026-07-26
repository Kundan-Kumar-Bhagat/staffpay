import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { PageHead, Btn, Field, StatusPill, Reveal, Spinner, Empty, useToast, Icon, STATUS } from '../components/ui';
import { currentMonth, dstr, downloadUrl, prettyDate } from '../utils/format';

export default function Attendance() {
  const { user } = useAuth();
  const { company } = useCompany();
  const toast = useToast();
  const isMgr = user.role !== 'staff';
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [markDate, setMarkDate] = useState(dstr());
  const [dayRecs, setDayRecs] = useState([]);
  const [entries, setEntries] = useState({});
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/attendance?month=${month}`).then(r => setRows(r.data));
  useEffect(() => { load(); }, [month]);
  useEffect(() => {
    if (!isMgr) return;
    api.get('/users').then(r => setStaff(r.data.filter(u => u.status === 'active' && u.role !== 'admin')));
  }, []);
  useEffect(() => {
    if (!isMgr) return;
    api.get(`/attendance?date=${markDate}`).then(r => {
      setDayRecs(r.data);
      const map = {};
      r.data.forEach(rec => { map[rec.user._id] = { status: rec.status, note: rec.note || '' }; });
      setEntries(map);
    });
  }, [markDate]);

  const saveMarks = async () => {
    setBusy(true);
    try {
      const payload = staff.map(s => ({ userId: s._id, status: entries[s._id]?.status || 'present', note: entries[s._id]?.note || '' }));
      const { data } = await api.post('/attendance/mark', { date: markDate, entries: payload });
      toast(data.message);
      api.get(`/attendance?date=${markDate}`).then(setDayRecs);
      load();
    } catch (e) { toast(e.response?.data?.message || 'Save failed', 'err'); }
    setBusy(false);
  };

  const filtered = useMemo(() => (rows || []).filter(r =>
    (!filterUser || r.user?._id === filterUser) && (!filterStatus || r.status === filterStatus)), [rows, filterUser, filterStatus]);

  const exportXlsx = async () => {
    try { await downloadUrl(`/reports/attendance-xlsx?month=${month}`, `attendance-${month}.xlsx`); toast('Excel downloaded'); }
    catch { toast('Export failed', 'err'); }
  };

  return (
    <>
      <PageHead title="Attendance" sub={isMgr ? 'Mark the day, audit the month, export to Excel.' : 'Your daily record and monthly history.'}>
        {isMgr && <Btn variant="ghost" onClick={exportXlsx}><Icon name="down" size={15} /> Export Excel</Btn>}
      </PageHead>

      {isMgr && (
        <Reveal>
          <div className="card mark-card">
            <div className="mark-head">
              <h3 className="card-title">Mark attendance</h3>
              <Field label="Date"><input type="date" className="input" value={markDate} max={dstr()} onChange={e => setMarkDate(e.target.value)} /></Field>
              <Btn onClick={saveMarks} disabled={busy}>{busy ? 'Saving…' : `Save ${staff.length} entries`}</Btn>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Staff</th><th>Designation</th><th>Status</th><th>Note</th><th>Recorded</th></tr></thead>
                <tbody>
                  {staff.map(s => {
                    const rec = dayRecs.find(r => r.user?._id === s._id);
                    const val = entries[s._id] || {};
                    return (
                      <tr key={s._id}>
                        <td><b>{s.name}</b> <span className="muted mono">{s.employeeId}</span></td>
                        <td className="muted">{s.designation}</td>
                        <td>
                          <select className="input input-sm" value={val.status || rec?.status || 'present'}
                            onChange={e => setEntries(en => ({ ...en, [s._id]: { ...en[s._id], status: e.target.value } }))}>
                            {Object.entries(STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
                          </select>
                        </td>
                        <td><input className="input input-sm" placeholder="Optional note" value={val.note || ''}
                          onChange={e => setEntries(en => ({ ...en, [s._id]: { ...en[s._id], note: e.target.value } }))} /></td>
                        <td className="muted mono">{rec?.checkIn ? `${rec.checkIn}–${rec.checkOut || '…'}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={80}>
        <div className="card">
          <div className="card-toolbar">
            <h3 className="card-title">Register — {month}</h3>
            <div className="toolbar-right">
              {isMgr && (
                <select className="input input-sm" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                  <option value="">All staff</option>
                  {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              )}
              <select className="input input-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All statuses</option>
                {Object.entries(STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <input type="month" className="input input-sm" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
          </div>
          {rows === null ? <Spinner /> : !filtered.length ? (
            <Empty icon="clock" title="No records" sub="Nothing logged for these filters yet." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th>{isMgr && <th>Staff</th>}<th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th><th>Note</th></tr></thead>
                <tbody>
                  {[...filtered].reverse().map(r => (
                    <tr key={r._id}>
                      <td className="mono">{prettyDate(r.date)}</td>
                      {isMgr && <td><b>{r.user?.name}</b></td>}
                      <td className="mono">{r.checkIn || '—'}</td>
                      <td className="mono">{r.checkOut || '—'}</td>
                      <td className="mono">{r.hours || '—'}</td>
                      <td><StatusPill s={r.status} /></td>
                      <td className="muted">{r.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>
    </>
  );
}