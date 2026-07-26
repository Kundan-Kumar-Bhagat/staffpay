import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { PageHead, Btn, Field, RoleBadge, useToast, Reveal, initials } from '../utils/format-barrel';

export default function Profile() {
  const { user } = useAuth();
  const { company } = useCompany();
  const toast = useToast();
  const [form, setForm] = useState({ oldPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  const change = async e => {
    e.preventDefault(); setBusy(true);
    try { const { data } = await api.put('/auth/password', form); toast(data.message); setForm({ oldPassword: '', newPassword: '' }); }
    catch (e2) { toast(e2.response?.data?.message || 'Failed', 'err'); }
    setBusy(false);
  };

  const row = (l, v) => <div className="prof-row"><span>{l}</span><strong>{v || '—'}</strong></div>;

  return (
    <>
      <PageHead title="My profile" sub="Your record as it appears on payslips." />
      <div className="grid-2">
        <Reveal>
          <div className="card">
            <div className="prof-head">
              <span className="avatar xl" style={{ background: user.color || '#0F3D33' }}>{initials(user.name)}</span>
              <div><h3>{user.name}</h3><RoleBadge role={user.role} /> <span className="muted mono">{user.employeeId}</span></div>
            </div>
            {row('Designation', user.designation)}
            {row('Department', user.department)}
            {row('Email', user.email)}
            {row('Phone', user.phone)}
            {row('Joined', user.joinDate ? new Date(user.joinDate).toLocaleDateString('en-GB') : '')}
            {row('Bank', user.bank?.name ? `${user.bank.name} • ${user.bank.accountNo}` : '')}
            {row('PAN', user.pan)}
            {row('PF / UAN', user.pfNo)}
            {row('Reports to', company?.managerName)}
          </div>
        </Reveal>
        <Reveal delay={100}>
          <form onSubmit={change} className="card stack">
            <h3 className="card-title">Change password</h3>
            <Field label="Current password"><input className="input" type="password" value={form.oldPassword} onChange={e => setForm(f => ({ ...f, oldPassword: e.target.value }))} /></Field>
            <Field label="New password"><input className="input" type="password" required minLength={6} value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} /></Field>
            <Btn type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Btn>
            <p className="muted">Signed in {user.googleId ? 'via Google — password is optional.' : 'with email & password.'}</p>
          </form>
        </Reveal>
      </div>
    </>
  );
}