import { useEffect, useState } from 'react';
import api from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { PageHead, Stat, Btn, Reveal, Spinner, Icon, useToast, Modal } from '../components/ui';
import { StatusDonut, DailyBars, PayrollLine } from '../components/charts';
import { currentMonth, monthLabel, shiftMonth, money, downloadUrl } from '../utils/format';

export default function Reports() {
  const { company } = useCompany();
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [trend, setTrend] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [digest, setDigest] = useState(null);
  const [digestOpen, setDigestOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const cur = company?.currency || 'INR';

  useEffect(() => {
    setSummary(null);
    api.get(`/reports/summary?month=${month}`).then(r => setSummary(r.data));
    api.get(`/reports/daily?month=${month}`).then(r => setDaily(r.data));
    api.get('/reports/trend?months=6').then(r => setTrend(r.data));
    api.get(`/reports/staff?month=${month}`).then(r => setStaffRows(r.data));
  }, [month]);

  useEffect(() => { api.get('/reports/digest-preview').then(r => setDigest(r.data)).catch(() => {}); }, []);

  const sendNow = async () => {
    setSending(true);
    try {
      const { data } = await api.post('/reports/digest-send');
      toast(data.sent ? `Digest emailed to ${data.sent} manager(s)` : 'Nothing sent — configure SMTP and give managers emails', data.sent ? 'ok' : 'err');
    } catch { toast('Send failed', 'err'); }
    setSending(false);
  };

  const donut = summary ? Object.entries(summary.counts).map(([k, v]) => ({
    name: k[0].toUpperCase() + k.slice(1), value: v,
    color: { present: '#2E9E6B', late: '#E8A23C', absent: '#D64545', leave: '#3E7CB1', half: '#1E8E8E' }[k],
  })) : [];
  const maxHours = Math.max(1, ...staffRows.map(s => s.hours));

  const exportXlsx = async () => {
    try { await downloadUrl(`/reports/attendance-xlsx?month=${month}`, `attendance-${month}.xlsx`); toast('Excel downloaded'); }
    catch { toast('Export failed', 'err'); }
  };

  return (
    <>
      <PageHead title="Reports" sub="The month in numbers — attendance, payroll and people.">
        <div className="month-nav">
          <Btn variant="ghost" className="btn-sm" onClick={() => setMonth(m => shiftMonth(m, -1))}>←</Btn>
          <strong className="mono">{monthLabel(month)}</strong>
          <Btn variant="ghost" className="btn-sm" onClick={() => setMonth(m => shiftMonth(m, 1))}>→</Btn>
        </div>
        <Btn variant="ghost" onClick={exportXlsx}><Icon name="down" size={15} /> Attendance Excel</Btn>
      </PageHead>

      {!summary ? <Spinner /> : (
        <>
          <div className="grid-4">
            <Reveal><Stat label="Attendance rate" value={summary.rate} sub="% of records on-time" /></Reveal>
            <Reveal delay={60}><Stat label="Records logged" value={Object.values(summary.counts).reduce((a, b) => a + b, 0)} sub={`${summary.headcount} active staff`} /></Reveal>
            <Reveal delay={120}><Stat label="Gross payroll" value={summary.gross} isMoney currency={cur} /></Reveal>
            <Reveal delay={180}><Stat label="Net payroll" value={summary.payroll} isMoney currency={cur} sub={`${summary.slips} payslips issued`} /></Reveal>
          </div>
          <div className="grid-2">
            <Reveal><div className="card"><h3 className="card-title">Status distribution — {monthLabel(month)}</h3><StatusDonut data={donut} /></div></Reveal>
            <Reveal delay={100}><div className="card"><h3 className="card-title">Daily attendance</h3><DailyBars data={daily} /></div></Reveal>
          </div>
          <Reveal><div className="card"><h3 className="card-title">Payroll & attendance trend — 6 months</h3><PayrollLine data={trend} /></div></Reveal>
          <Reveal delay={80}>
            <div className="card">
              <h3 className="card-title">Per-staff summary — {monthLabel(month)}</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Staff</th><th>Present</th><th>Late</th><th>Half</th><th>Leave</th><th>Absent</th><th className="hours-col">Hours</th><th>Net pay</th></tr></thead>
                  <tbody>
                    {staffRows.map(s => (
                      <tr key={s.id}>
                        <td><b>{s.name}</b> <span className="muted mono">{s.employeeId}</span></td>
                        <td className="mono">{s.present}</td><td className="mono">{s.late}</td><td className="mono">{s.half}</td>
                        <td className="mono">{s.leave}</td><td className="mono">{s.absent}</td>
                        <td className="hours-col"><div className="hbar"><i style={{ width: `${(s.hours / maxHours) * 100}%` }} /></div><span className="mono">{s.hours}h</span></td>
                        <td className="mono"><b>{s.net != null ? money(s.net, cur) : '—'}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="card digest-card">
              <div>
                <h3 className="card-title">Monday manager digest</h3>
                <p className="digest-sub">
                  {digest
                    ? <>{digest.stats.out} out today · {digest.stats.unmarked} unmarked · {digest.stats.pending} approvals waiting · month at {digest.stats.rate}%</>
                    : 'Loading live figures…'}
                </p>
              </div>
              <div className="row-actions">
                <Btn variant="ghost" onClick={() => setDigestOpen(true)} disabled={!digest}>Preview email</Btn>
                <Btn onClick={sendNow} disabled={sending}>{sending ? 'Sending…' : 'Send now'}</Btn>
              </div>
            </div>
          </Reveal>
          <Modal open={digestOpen} onClose={() => setDigestOpen(false)} title="Digest preview — exactly what managers receive" wide>
            {digest && <div className="digest-frame" dangerouslySetInnerHTML={{ __html: digest.html }} />}
          </Modal>
        </>
      )}
    </>
  );
}