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
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast('Passwords do not match', 'err');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, remember });
      applySession(data, remember); toast('Account created — welcome aboard'); nav('/');
    } catch (e) { toast(e.response?.data?.message || 'Signup failed', 'err'); }
    setBusy(false);
  };

  return (
    <AuthShell title="Create your account" sub="The first account on a fresh workspace becomes the admin.">
      <form onSubmit={submit} className="stack">
        <Field label="Full name"><input className="input" required value={form.name} onChange={set('name')} placeholder="Your name" /></Field>
        <Field label="Email"><input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98XXX XXXXX" /></Field>
        <div className="grid-2">
          <Field label="Password"><input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} /></Field>
          <Field label="Confirm"><input className="input" type="password" required value={form.confirm} onChange={set('confirm')} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me on this device</label>
        <Btn type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Btn>
      </form>
      <p className="auth-alt">Already registered? <Link to="/login" className="link">Sign in</Link></p>
    </AuthShell>
  );
}