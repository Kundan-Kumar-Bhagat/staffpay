import { useEffect, useState } from 'react';
import api from '../api/client';
import { PageHead, Btn, Field, Modal, useToast, Reveal, Icon } from '../components/ui';

export default function Workspaces() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', plan: 'trial', ownerEmail: '' });
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/workspaces').then(r => setRows(r.data));
  useEffect(() => { load(); }, []);

  const provision = async e => {
    e.preventDefault(); setBusy(true);
    try { await api.post('/workspaces', form); toast('Workspace provisioned'); setModal(false); setForm({ name: '', plan: 'trial', ownerEmail: '' }); load(); }
    catch (e2) { toast(e2.response?.data?.message || 'Failed', 'err'); }
    setBusy(false);
  };

  const setPlan = async (ws, plan) => { await api.put(`/workspaces/${ws._id}`, { plan }); toast(`${ws.name} → ${plan}`); load(); };
  const toggleStatus = async ws => {
    const status = ws.status === 'active' ? 'suspended' : 'active';
    await api.put(`/workspaces/${ws._id}`, { status });
    toast(status === 'active' ? 'Reactivated' : 'Suspended — logins blocked'); load();
  };

  return (
    <>
      <PageHead title="Workspaces" sub="Provision companies, set plans, suspend abuse — the platform view.">
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={15} /> Provision workspace</Btn>
      </PageHead>
      <Reveal>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Company</th><th>Plan</th><th>Staff</th><th>Payslips</th><th>Join code</th><th>Status</th><th /></tr></thead>
              <tbody>
                {(rows || []).map(ws => (
                  <tr key={ws._id}>
                    <td><b>{ws.name}</b><br /><span className="muted mono">{ws.slug}</span></td>
                    <td>
                      <select className={`input input-sm plan-select plan-${ws.plan}`} value={ws.plan} onChange={e => setPlan(ws, e.target.value)}>
                        <option value="trial">trial</option><option value="pro">pro</option>
                      </select>
                    </td>
                    <td className="mono">{ws.staff}{ws.plan === 'trial' ? ' / 10' : ''}</td>
                    <td className="mono">{ws.slips}</td>
                    <td className="mono">{ws.joinCode}</td>
                    <td><span className={`pill ${ws.status === 'active' ? 'st-present' : 'st-absent'}`}>{ws.status}</span></td>
                    <td className="row-end">
                      <Btn variant={ws.status === 'active' ? 'danger-ghost' : 'ghost'} className="btn-sm" onClick={() => toggleStatus(ws)}>
                        {ws.status === 'active' ? 'Suspend' : 'Activate'}
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <Modal open={modal} onClose={() => setModal(false)} title="Provision a workspace">
        <form onSubmit={provision} className="stack">
          <Field label="Company name"><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Plan">
            <select className="input" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
              <option value="trial">Trial — 10 staff</option><option value="pro">Pro — unlimited</option>
            </select>
          </Field>
          <Field label="Owner email (optional — attaches an existing account)"><input className="input" type="email" value={form.ownerEmail} onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))} /></Field>
          <div className="row-end"><Btn type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn type="submit" disabled={busy}>{busy ? 'Creating…' : 'Provision'}</Btn></div>
        </form>
      </Modal>
    </>
  );
}
