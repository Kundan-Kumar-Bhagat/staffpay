import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { PageHead, StatusPill, Reveal, Spinner, Icon, Btn } from '../components/ui';
import CalendarGrid from '../components/CalendarGrid';
import { currentMonth, monthLabel, shiftMonth, prettyDate } from '../utils/format';

export default function CalendarReport() {
  const { user } = useAuth();
  const { company } = useCompany();
  const isMgr = user.role !== 'staff';
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = filterUser ? `&userId=${filterUser}` : '';
    api.get(`/attendance?month=${month}${q}`).then(r => setRows(r.data));
  }, [month, filterUser]);
  useEffect(() => { if (isMgr) api.get('/users').then(r => setStaff(r.data.filter(u => u.status === 'active' && u.role !== 'admin'))); }, []);

  const byDate = useMemo(() => {
    const map = {};
    (rows || []).forEach(r => (map[r.date] ||= []).push(r));
    return map;
  }, [rows]);

  const monthTotals = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, leave: 0, half: 0 };
    (rows || []).forEach(r => c[r.status]++);
    return c;
  }, [rows]);

  return (
    <>
      <PageHead title="Calendar Report" sub="A month of attendance at a glance — tap any day for detail.">
        <div className="month-nav">
          <Btn variant="ghost" className="btn-sm" onClick={() => setMonth(m => shiftMonth(m, -1))}>←</Btn>
          <strong className="mono">{monthLabel(month)}</strong>
          <Btn variant="ghost" className="btn-sm" onClick={() => setMonth(m => shiftMonth(m, 1))}>→</Btn>
        </div>
      </PageHead>

      <div className="grid-cal">
        <Reveal>
          <div className="card">
            <div className="card-toolbar">
              <h3 className="card-title">{monthLabel(month)}</h3>
              {isMgr && (
                <select className="input input-sm" value={filterUser} onChange={e => { setFilterUser(e.target.value); setSelected(null); }}>
                  <option value="">Whole team</option>
                  {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              )}
            </div>
            {rows === null ? <Spinner /> : (
              <CalendarGrid month={month} records={byDate} workingDays={company?.workingDays}
                holidays={company?.holidays || []} onPick={setSelected} selected={selected} />
            )}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="card side-panel">
            <h3 className="card-title">{selected ? prettyDate(selected) : 'Month summary'}</h3>
            {selected ? (
              <div className="mini-list">
                {(byDate[selected] || []).map(r => (
                  <div key={r._id} className="mini-row">
                    <span>{isMgr ? r.user?.name : 'You'}</span>
                    <StatusPill s={r.status} />
                    <span className="muted mono">{r.checkIn ? `${r.checkIn}–${r.checkOut || '…'}` : ''}</span>
                  </div>
                ))}
                {!byDate[selected]?.length && <p className="muted">No entries on this day.</p>}
              </div>
            ) : (
              <>
                <div className="sum-chips">
                  {Object.entries(monthTotals).map(([k, v]) => <div key={k} className="sum-chip"><b>{v}</b><span>{k}</span></div>)}
                </div>
                <p className="muted">Total records: {(rows || []).length} • Working days: {company?.workingDays?.length ? 'per schedule' : 'Mon–Sat'}</p>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </>
  );
}