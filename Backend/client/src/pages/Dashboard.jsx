import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { PageHead, Stat, Reveal, StatusPill, Btn, Icon, Spinner, useToast } from '../components/ui';
import { StatusDonut, DailyBars, PayrollLine } from '../components/charts';
import { currentMonth, money, prettyDate } from '../utils/format'; 
import ActivityFeed from '../components/ActivityFeed';


function CheckInCard({ rec, onDone }) {
  const [now, setNow] = useState(new Date());
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const act = async endpoint => {
    setBusy(true);
    try { const { data } = await api.post(`/attendance/${endpoint}`); onDone(data.record, data.message); }
    catch (e) { onDone(null, e.response?.data?.message || 'Failed'); }
    setBusy(false);
  };
  return (
    <div className={`checkin-card ${!rec?.checkIn ? 'pulse' : ''}`}>
      <span className="stat-label">Right now</span>
      <strong className="checkin-time">{now.toLocaleTimeString('en-GB')}</strong>
      <div className="checkin-row">
        {!rec?.checkIn ? (
          <Btn variant="amber" disabled={busy} onClick={() => act('checkin')}>{busy ? '…' : 'Check in'}</Btn>
        ) : !rec?.checkOut ? (
          <Btn disabled={busy} onClick={() => act('checkout')}>{busy ? '…' : 'Check out'}</Btn>
        ) : <span className="pill st-present">Day complete — {rec.hours}h</span>}
        {rec?.checkIn && <span className="muted">In {rec.checkIn}{rec.checkOut ? ` • Out ${rec.checkOut}` : ''}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { company } = useCompany();
  const toast = useToast();
  const month = currentMonth();
  const isStaff = user.role === 'staff';
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [daily, setDaily] = useState([]);
  const [todayRec, setTodayRec] = useState(null);
  const [myMonth, setMyMonth] = useState([]);
  const [latestSlip, setLatestSlip] = useState(null);
  const [slips, setSlips] = useState([]);

  useEffect(() => {
    api.get('/attendance/today').then(r => setTodayRec(r.data));
    api.get(`/attendance?month=${month}`).then(r => setMyMonth(r.data));
    if (isStaff) {
      api.get('/payslips').then(r => setLatestSlip(r.data[0]));
    } else {
      api.get(`/reports/summary?month=${month}`).then(r => setSummary(r.data));
      api.get('/reports/trend?months=6').then(r => setTrend(r.data));
      api.get(`/reports/daily?month=${month}`).then(r => setDaily(r.data));
      api.get('/payslips').then(r => setSlips(r.data.slice(0, 5)));
    }
  }, []);

  const cur = company?.currency || 'INR';
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const my = {
    present: myMonth.filter(a => ['present', 'late'].includes(a.status)).length,
    hours: Math.round(myMonth.reduce((s, a) => s + (a.hours || 0), 0)),
  };
  const donut = (counts) => Object.entries(counts).map(([k, v]) => ({
    name: k[0].toUpperCase() + k.slice(1), value: v,
    color: { present: '#2E9E6B', late: '#E8A23C', absent: '#D64545', leave: '#3E7CB1', half: '#1E8E8E' }[k],
  }));

  return (
    <>
      <PageHead title={`${greet}, ${user.name.split(' ')[0]}.`}
        sub={new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
        {!isStaff && <Link to="/payslips"><Btn><Icon name="doc" size={15} /> Payslips</Btn></Link>}
      </PageHead>

      {todayRec === null ? <Spinner /> : (
        <>
          {isStaff ? (
            <>
              <Reveal><CheckInCard rec={todayRec} onDone={(rec, msg) => {
                if (rec) { setTodayRec(rec); toast(msg); }
                else if (msg) toast(msg, 'err');
              }} /></Reveal>
              <div className="grid-4">
                <Reveal delay={60}><Stat label="Days present (this month)" value={my.present} /></Reveal>
                <Reveal delay={120}><Stat label="Hours logged" value={my.hours} sub="h this month" /></Reveal>
                <Reveal delay={180}><Stat label="Today" value={<StatusPill s={todayRec.status} />} /></Reveal>
                <Reveal delay={240}><Stat label="Latest payslip" value={latestSlip ? money(latestSlip.net, cur) : '—'} sub={latestSlip?.monthName || 'Not generated yet'} /></Reveal>
              </div>
              <div className="grid-2">
                <Reveal><div className="card"><h3 className="card-title">My month at a glance</h3><StatusDonut data={donut({ present: myMonth.filter(a => a.status === 'present').length, late: myMonth.filter(a => a.status === 'late').length, half: myMonth.filter(a => a.status === 'half').length, leave: myMonth.filter(a => a.status === 'leave').length, absent: myMonth.filter(a => a.status === 'absent').length })} /></div></Reveal>
                <Reveal delay={100}>
                  <div className="card">
                    <h3 className="card-title">Recent days</h3>
                    <div className="mini-list">
                      {[...myMonth].reverse().slice(0, 7).map(a => (
                        <div key={a._id} className="mini-row"><span>{prettyDate(a.date)}</span><StatusPill s={a.status} /><span className="muted mono">{a.hours ? a.hours + 'h' : ''}</span></div>
                      ))}
                    </div>
                    <Link to="/calendar" className="link">Open calendar report →</Link>
                  </div>
                </Reveal>
              </div>
            </>
          ) : !summary ? <Spinner /> : (
            <>
              <div className="grid-4">
                <Reveal><Stat label="Active headcount" value={summary.headcount} /></Reveal>
                <Reveal delay={60}><Stat label="Present today" value={summary.today.present + summary.today.late} sub={`of ${summary.todayTotal} marked`} /></Reveal>
                <Reveal delay={120}><Stat label="Attendance rate" value={summary.rate} sub="% this month" /></Reveal>
                <Reveal delay={180}><Stat label="Payroll (net)" value={summary.payroll} isMoney currency={cur} sub={summary.month} /></Reveal>
              </div>
              <div className="grid-dash">
                <Reveal><div className="card"><h3 className="card-title">Daily attendance — {summary.month}</h3><DailyBars data={daily} /></div></Reveal>
                <Reveal delay={100}><div className="card"><h3 className="card-title">Today's status</h3><StatusDonut data={donut(summary.today)} /></div></Reveal>
              </div>
              <div className="grid-dash">
                <Reveal><div className="card"><h3 className="card-title">Payroll trend — 6 months</h3><PayrollLine data={trend} /></div></Reveal>
                <Reveal delay={100}>
                  <div className="card">
                    <h3 className="card-title">Latest payslips</h3>
                      <Reveal delay={150}>
                        <div className="card"><h3 className="card-title">Recent activity</h3><ActivityFeed /></div>
                      </Reveal>
                    <div className="mini-list">
                      {slips.map(p => (
                        <div key={p._id} className="mini-row"><span>{p.user?.name}</span><span className="muted">{p.monthName?.split(' ')[0]}</span><b className="mono">{money(p.net, cur)}</b></div>
                      ))}
                      {!slips.length && <p className="muted">None yet — generate from the Payslips page.</p>}
                    </div>
                    <Link to="/reports" className="link">Full reports →</Link>
                  </div>
                </Reveal>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}