import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PageHead, Btn, Field, useToast, Reveal, Empty, Spinner } from '../components/ui';
import { dstr, prettyDate } from '../utils/format';

const TYPE_LABEL = { casual: 'Casual', sick: 'Sick', unpaid: 'Unpaid' };
const LEAVE_PILL = { pending: 'st-late', approved: 'st-leave', rejected: 'st-absent' };

export default function Leave() {
  const { user } = useAuth();
  const toast = useToast();
  const isMgr = user.role !== 'staff';
  const [rows, setRows] = useState(null);
  const [balance, setBalance] = useState(null);
  const [form, setForm] = useState({ from: dstr(), to: dstr(), type: 'casual', reason: '' });
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get('/leave').then(r => setRows(r.data));
    api.get('/leave/balance').then(r => setBalance(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const apply = async e => {
    e.preventDefault(); setBusy(true);
    try { await api.post('/leave', form); toast('Leave request sent for approval'); setForm(f => ({ ...f, reason: '' })); load(); }
    catch (e2) { toast(e2.response?.data?.message || 'Request failed', 'err'); }
    setBusy(false);
  };

  const decide = async (id, status) => {
    try {
      await api.put(`/leave/${id}/decide`, { status });
      toast(status === 'approved' ? 'Approved — attendance updated automatically' : 'Request rejected');
      load();
    } catch (e) { toast(e.response?.data?.message || 'Failed', 'err'); }
  };

  const withdraw = async id => {
    try { await api.delete(`/leave/${id}`); toast('Request withdrawn'); load(); }
    catch (e) { toast(e.response?.data?.message || 'Failed', 'err'); }
  };

  const pending = (rows || []).filter(r => r.status === 'pending');
  const history = (rows || []).filter(r => r.status !== 'pending');

  return (
    <>
      <PageHead title="Leave"
        sub={isMgr ? 'Approve requests — approved days flow straight into attendance and payroll.' : 'Apply for leave and track your requests.'} />

      {balance && (
        <div className="grid-3">
          {balance.map(b => (
            <div key={b.type} className="card bal-card">
              <span className="stat-label">{TYPE_LABEL[b.type]} leave</span>
              <div className="bal-nums"><strong>{b.left}</strong><span>of {b.quota} days left this year</span></div>
              <div className="bal-bar"><i style={{ width: `${Math.min(100, b.quota ? (b.used / b.quota) * 100 : 0)}%` }} /></div>
              <span className="muted">{b.used} used</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid-cal">
        <Reveal>
          <form onSubmit={apply} className="card stack">
            <h3 className="card-title">New request</h3>
            <div className="grid-2">
              <Field label="From"><input type="date" className="input" required value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} /></Field>
              <Field label="To"><input type="date" className="input" required min={form.from} value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} /></Field>
            </div>
            <Field label="Type">
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="casual">Casual</option><option value="sick">Sick</option><option value="unpaid">Unpaid</option>
              </select>
            </Field>
            <Field label="Reason"><textarea className="input" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Short note for your manager…" /></Field>
            <Btn type="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit request'}</Btn>
          </form>
        </Reveal>

        <Reveal delay={80}>
          <div className="card">
            <h3 className="card-title">{isMgr ? `Pending approvals (${pending.length})` : 'My pending requests'}</h3>
            {rows === null ? <Spinner /> : !pending.length ? (
              <Empty icon="cal" title="All clear" sub="No pending leave requests." />
            ) : (
              <div className="mini-list">
                {pending.map(l => (
                  <div key={l._id} className="leave-row">
                    <div className="leave-meta">
                      <b>{isMgr ? l.user?.name : `${TYPE_LABEL[l.type]} leave`}</b>
                      <span className="muted">{prettyDate(l.from)} → {prettyDate(l.to)} · {l.days || 1} day(s)</span>
                      {l.reason && <span className="leave-reason">“{l.reason}”</span>}
                    </div>
                    <div className="row-actions">
                      {isMgr ? (
                        <>
                          <Btn className="btn-sm" onClick={() => decide(l._id, 'approved')}>Approve</Btn>
                          <Btn variant="danger-ghost" className="btn-sm" onClick={() => decide(l._id, 'rejected')}>Reject</Btn>
                        </>
                      ) : (
                        <Btn variant="ghost" className="btn-sm" onClick={() => withdraw(l._id)}>Withdraw</Btn>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <Reveal delay={120}>
        <div className="card">
          <h3 className="card-title">History</h3>
          {!history.length ? <p className="muted">Nothing here yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr>{isMgr && <th>Staff</th>}<th>Type</th><th>Dates</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {history.map(l => (
                    <tr key={l._id}>
                      {isMgr && <td><b>{l.user?.name}</b></td>}
                      <td>{TYPE_LABEL[l.type]}</td>
                      <td className="mono">{l.from} → {l.to}</td>
                      <td className="muted">{l.reason || '—'}</td>
                      <td><span className={`pill ${LEAVE_PILL[l.status]}`}>{l.status}</span></td>
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
