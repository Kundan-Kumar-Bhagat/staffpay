import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, Btn, Field } from '../components/ui';
import { AuthShell } from './Login';

export default function Signup() {
  const { applySession } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [mode, setMode] = useState('create');
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', companyName: '', joinCode: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast('Passwords do not match', 'err');
    setBusy(true);
    try {
      const payload = { ...form, remember, ...(mode === 'create' ? { joinCode: undefined } : { companyName: undefined }) };
      const { data } = await api.post('/auth/register', payload);
      applySession(data, remember);
      toast(mode === 'create' ? 'Workspace created — you are its admin' : `Joined ${data.user.workspaceInfo?.name}`);
      nav('/');
    } catch (e) { toast(e.response?.data?.message || 'Signup failed', 'err'); }
    setBusy(false);
  };

  return (
    <AuthShell title="Set up your workspace" sub="Start a company for your team, or join one with its 6-character code.">
      <div className="tabs">
        <button type="button" className={mode === 'create' ? 'on' : ''} onClick={() => setMode('create')}>Create company</button>
        <button type="button" className={mode === 'join' ? 'on' : ''} onClick={() => setMode('join')}>Join with code</button>
      </div>
      <form onSubmit={submit} className="stack">
        {mode === 'create' ? (
          <Field label="Company name"><input className="input" required value={form.companyName} onChange={set('companyName')} placeholder="Acme Logistics Pvt. Ltd." /></Field>
        ) : (
          <Field label="Join code"><input className="input mono join-input" required maxLength={6} value={form.joinCode} onChange={e => setForm(f => ({ ...f, joinCode: e.target.value.toUpperCase() }))} placeholder="7F3K9A" /></Field>
        )}
        <Field label="Your full name"><input className="input" required value={form.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className="input" type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98XXX XXXXX" /></Field>
        <div className="grid-2">
          <Field label="Password"><input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} /></Field>
          <Field label="Confirm"><input className="input" type="password" required value={form.confirm} onChange={set('confirm')} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me on this device</label>
        <Btn type="submit" disabled={busy}>{busy ? 'Working…' : mode === 'create' ? 'Create workspace' : 'Join workspace'}</Btn>
      </form>
      <p className="auth-alt">Already registered? <Link to="/login" className="link">Sign in</Link></p>
    </AuthShell>
  );
}