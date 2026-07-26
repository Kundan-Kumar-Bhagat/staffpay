import { useEffect, useState } from 'react';
import api from '../api/client';
import { PageHead, Btn, Field, Modal, RoleBadge, useToast, Icon, Reveal, Empty } from '../components/ui';
import { initials } from '../utils/format';

const blank = {
  name: '', email: '', phone: '', role: 'staff', department: '', designation: '', password: '',
  salary: { basic: 0, hra: 0, allowances: 0 }, bank: { name: '', accountNo: '', ifsc: '' }, pan: '', pfNo: ''
};

export default function Staff() {
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/users').then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const open = u => {
    setEditing(u || null);
    setForm(u ? { ...blank, ...u, salary: { ...blank.salary, ...u.salary }, bank: { ...blank.bank, ...u.bank } } : blank);
    setModal(true);
  };

  const save = async e => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) { await api.put(`/users/${editing._id}`, form); toast('Staff member updated'); }
      else { await api.post('/users', form); toast('Staff member added'); }
      setModal(false); load();
    } catch (e) { toast(e.response?.data?.message || 'Save failed', 'err'); }
    setBusy(false);
  };

  const toggle = async u => {
    const next = u.status === 'active' ? 'inactive' : 'active';
    try { await api.put(`/users/${u._id}`, { status: next }); toast(next === 'active' ? 'Reactivated' : 'Deactivated'); load(); }
    catch (e) { toast(e.response?.data?.message || 'Failed', 'err'); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setSal = k => e => setForm(f => ({ ...f, salary: { ...f.salary, [k]: +e.target.value } }));
  const setBank = k => e => setForm(f => ({ ...f, bank: { ...f.bank, [k]: e.target.value } }));

  const list = (users || []).filter(u => (u.name + u.employeeId + u.email + u.designation).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHead title="Staff" sub="Add people, set roles and salaries — payslips build on this.">
        <Btn onClick={() => open(null)}><Icon name="plus" size={15} /> Add staff</Btn>
      </PageHead>

      <Reveal>
        <div className="card">
          <div className="card-toolbar">
            <h3 className="card-title">{users?.length || 0} people</h3>
            <input className="input input-sm search" placeholder="Search name, ID, role…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {users === null ? null : !list.length ? <Empty icon="users" title="No staff found" sub="Add your first staff member to begin." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Person</th><th>Role</th><th>Contact</th><th>Monthly gross</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.map(u => (
                    <tr key={u._id} className={u.status === 'inactive' ? 'dim' : ''}>
                      <td>
                        <div className="person"><span className="avatar" style={{ background: u.color || '#0F3D33' }}>{initials(u.name)}</span>
                          <div><b>{u.name}</b><span className="muted mono">{u.employeeId} • {u.designation || '—'}</span></div>
                        </div>
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td className="muted">{u.email}<br />{u.phone}</td>
                      <td className="mono">{(u.salary.basic + u.salary.hra + u.salary.allowances).toLocaleString()}</td>
                      <td><span className={`pill ${u.status === 'active' ? 'st-present' : 'st-absent'}`}>{u.status}</span></td>
                      <td className="row-end">
                        <Btn variant="ghost" className="btn-sm" onClick={() => open(u)}>Edit</Btn>
                        <Btn variant={u.status === 'active' ? 'danger-ghost' : 'ghost'} className="btn-sm" onClick={() => toggle(u)}>
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit — ${editing.name}` : 'Add staff member'} wide>
        <form onSubmit={save} className="stack">
          <div className="grid-3">
            <Field label="Full name *"><input className="input" required value={form.name} onChange={set('name')} /></Field>
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={set('email')} /></Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Role">
              <select className="input" value={form.role} onChange={set('role')}>
                <option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Designation"><input className="input" value={form.designation} onChange={set('designation')} /></Field>
            <Field label="Department"><input className="input" value={form.department} onChange={set('department')} /></Field>
          </div>
          <h4 className="sect">Monthly salary</h4>
          <div className="grid-3">
            <Field label="Basic"><input className="input" type="number" value={form.salary.basic} onChange={setSal('basic')} /></Field>
            <Field label="HRA"><input className="input" type="number" value={form.salary.hra} onChange={setSal('hra')} /></Field>
            <Field label="Allowances"><input className="input" type="number" value={form.salary.allowances} onChange={setSal('allowances')} /></Field>
          </div>
          <h4 className="sect">Bank & statutory</h4>
          <div className="grid-3">
            <Field label="Bank name"><input className="input" value={form.bank.name} onChange={setBank('name')} /></Field>
            <Field label="Account no."><input className="input" value={form.bank.accountNo} onChange={setBank('accountNo')} /></Field>
            <Field label="IFSC"><input className="input" value={form.bank.ifsc} onChange={setBank('ifsc')} /></Field>
            <Field label="PAN"><input className="input" value={form.pan} onChange={set('pan')} /></Field>
            <Field label="PF / UAN no."><input className="input" value={form.pfNo} onChange={set('pfNo')} /></Field>
            {!editing && <Field label="Temp password"><input className="input" value={form.password} onChange={set('password')} placeholder="Default: Change@123" /></Field>}
          </div>
          <div className="row-end"><Btn type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn></div>
        </form>
      </Modal>
    </>
  );
}