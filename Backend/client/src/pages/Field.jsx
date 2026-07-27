import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { PageHead, Btn, Field, Reveal, Empty, Spinner, StatusPill, Icon } from '../components/ui';
import { currentMonth, shiftMonth, monthLabel } from '../utils/format';

export default function Field() {
  const nav = useNavigate();
  const [from, setFrom] = useState(`${currentMonth()}-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState(null);

  const load = () => api.get(`/kiosk/logs?from=${from}&to=${to}`).then(r => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const byWorker = useMemo(() => {
    const map = {};
    (rows || []).forEach(r => {
      (map[r.phone] ||= { name: r.name, phone: r.phone, days: 0, hours: 0 }).days += 1;
      map[r.phone].hours = Math.round((map[r.phone].hours + (r.hours || 0)) * 10) / 10;
      map[r.phone].name = r.name;
    });
    return Object.values(map).sort((a, b) => b.days - a.days);
  }, [rows]);

  const totalHours = (rows || []).reduce((s, r) => s + (r.hours || 0), 0);

  const pay = w => nav(`/vouchers?name=${encodeURIComponent(w.name)}&phone=${encodeURIComponent(w.phone)}&qty=${w.days}&desc=${encodeURIComponent(`Field labour — ${from} to ${to} (${w.days} days, ${w.hours}h)`)}`);

  return (
    <>
      <PageHead title="Field Log" sub="Gate-kiosk taps from workers without accounts — turn days worked into a voucher in one tap.">
        <Field label="From"><input type="date" className="input input-sm" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className="input input-sm" value={to} onChange={e => setTo(e.target.value)} /></Field>
        <Btn onClick={load}>Load</Btn>
      </PageHead>

      <div className="grid-3">
        <Reveal><div className="stat"><span className="stat-label">Taps in range</span><span className="stat-value">{rows?.length ?? '—'}</span></div></Reveal>
        <Reveal delay={60}><div className="stat"><span className="stat-label">Distinct workers</span><span className="stat-value">{byWorker.length}</span></div></Reveal>
        <Reveal delay={120}><div className="stat"><span className="stat-label">Hours logged</span><span className="stat-value">{Math.round(totalHours)}</span></div></Reveal>
      </div>

      <Reveal delay={80}>
        <div className="card">
          <h3 className="card-title">Pay a worker</h3>
          {!byWorker.length ? <Empty icon="clock" title="No gate taps in this range" sub="Enable the kiosk in Settings, then taps appear here." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Worker</th><th>Phone</th><th>Days</th><th>Hours</th><th /></tr></thead>
                <tbody>
                  {byWorker.map(w => (
                    <tr key={w.phone}>
                      <td><b>{w.name}</b></td><td className="mono">{w.phone}</td>
                      <td className="mono">{w.days}</td><td className="mono">{w.hours}</td>
                      <td className="row-end"><Btn className="btn-sm" onClick={() => pay(w)}><Icon name="cash" size={14} /> Voucher for {w.days} day{w.days > 1 ? 's' : ''}</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="card">
          <h3 className="card-title">All taps</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Name</th><th>Phone</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th></tr></thead>
              <tbody>
                {(rows || []).map(r => (
                  <tr key={r._id}>
                    <td className="mono">{r.date}</td><td><b>{r.name}</b></td><td className="mono">{r.phone}</td>
                    <td className="mono">{r.checkIn || '—'}</td><td className="mono">{r.checkOut || '—'}</td>
                    <td className="mono">{r.hours || '—'}</td><td><StatusPill s={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </>
  );
}
