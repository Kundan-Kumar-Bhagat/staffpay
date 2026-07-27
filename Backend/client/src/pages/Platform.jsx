import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { PageHead, Btn, useToast, Reveal, Spinner, Icon, Stat } from '../components/ui';
import { money, timeAgo } from '../utils/format';

const BILL_TONE = { trialing: 'st-late', active: 'st-present', demo: 'st-leave', past_due: 'st-absent', canceled: 'st-absent', expired: 'st-absent' };

export default function Platform() {
  const { user, setUser } = useAuth();
  const { reload } = useCompany();
  const toast = useToast();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState(null);

  const load = () => {
    api.get('/platform/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/platform/workspaces').then(r => setRows(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const enter = async ws => {
    const { data } = await api.post(`/platform/workspaces/${ws._id}/impersonate`);
    setUser(data.user); reload();
    toast(`Now viewing ${ws.name} — every action is logged`);
    nav('/');
  };
  const setPlan = async (ws, plan) => { await api.put(`/workspaces/${ws._id}`, { plan }); toast(`${ws.name} → ${plan}`); load(); };
  const toggleStatus = async ws => {
    await api.put(`/workspaces/${ws._id}`, { status: ws.status === 'active' ? 'suspended' : 'active' });
    toast(ws.status === 'active' ? 'Suspended' : 'Reactivated'); load();
  };
  const del = async ws => {
    const confirm = window.prompt(`Type DELETE to permanently erase "${ws.name}" and all its data:`);
    if (confirm !== 'DELETE') return;
    try { const { data } = await api.post(`/platform/workspaces/${ws._id}/delete`, { confirm }); toast(data.message); load(); }
    catch (e) { toast(e.response?.data?.message || 'Delete failed', 'err'); }
  };

  if (!stats || !rows) return <Spinner />;
  return (
    <>
      <PageHead title="Platform" sub="The operator console — revenue, trials, and every customer workspace." />

      <div className="grid-4">
        <Reveal><Stat label="MRR" value={stats.mrr} isMoney currency={stats.currency} sub={`${stats.pro} pro workspace${stats.pro !== 1 ? 's' : ''}`} /></Reveal>
        <Reveal delay={60}><Stat label="Active workspaces" value={stats.active} sub={`${stats.workspaces} total`} /></Reveal>
        <Reveal delay={120}><Stat label="Trials expiring ≤3d" value={stats.trialsExpiring.length} sub={stats.trialsExpiring.map(t => t.name.split(' ')[0]).join(', ') || 'none'} /></Reveal>
        <Reveal delay={180}><Stat label="Signups (30d)" value={stats.signups30} sub={`${stats.users} users · ${stats.payslips} payslips`} /></Reveal>
      </div>

      <Reveal delay={80}>
        <div className="card">
          <h3 className="card-title">New workspaces — last 30 days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.signupsByDay} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8DED9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#5B6B64' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#5B6B64' }} width={24} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(15,61,51,.06)' }} />
              <Bar dataKey="count" name="Signups" fill="#0F3D33" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="card">
          <h3 className="card-title">All workspaces</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Company</th><th>Plan</th><th>Seats</th><th>Staff</th><th>Slips</th><th>Billing</th><th>Last activity</th><th /></tr></thead>
              <tbody>
                {rows.map(ws => (
                  <tr key={ws._id}>
                    <td><b>{ws.name}</b><br /><span className="muted mono">{ws.slug}</span></td>
                    <td>
                      <select className={`input input-sm plan-select plan-${ws.plan}`} value={ws.plan} onChange={e => setPlan(ws, e.target.value)}>
                        <option value="trial">trial</option><option value="pro">pro</option>
                      </select>
                    </td>
                    <td className="mono">{ws.billing?.seats || '—'}</td>
                    <td className="mono">{ws.staff}</td>
                    <td className="mono">{ws.slips}</td>
                    <td><span className={`pill ${BILL_TONE[ws.billing?.status] || 'st-late'}`}>{ws.billing?.status || 'trialing'}</span></td>
                    <td className="muted">{ws.lastActivity ? timeAgo(ws.lastActivity) : 'never'}</td>
                    <td>
                      <div className="row-actions">
                        <Btn variant="ghost" className="btn-sm" onClick={() => enter(ws)}><Icon name="users" size={13} /> Enter</Btn>
                        <Btn variant={ws.status === 'active' ? 'danger-ghost' : 'ghost'} className="btn-sm" onClick={() => toggleStatus(ws)}>
                          {ws.status === 'active' ? 'Suspend' : 'Activate'}
                        </Btn>
                        <Btn variant="danger-ghost" className="btn-sm" onClick={() => del(ws)}>Delete</Btn>
                      </div>
                    </td>
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
