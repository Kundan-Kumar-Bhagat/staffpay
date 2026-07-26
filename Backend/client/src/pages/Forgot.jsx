import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast, Btn, Field } from '../components/ui';
import { AuthShell } from './Login';

export default function Forgot() {
  const toast = useToast();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [devToken, setDevToken] = useState('');
  const [form, setForm] = useState({ token: '', password: '' });

  const requestCode = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot', { email });
      if (data.devToken) setDevToken(data.devToken);
      setStep(2); toast('Reset code issued');
    } catch (e) { toast(e.response?.data?.message || 'Request failed', 'err'); }
    setBusy(false);
  };

  const doReset = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post('/auth/reset', { email, token: form.token || devToken, password: form.password });
      toast(data.message); nav('/login');
    } catch (e) { toast(e.response?.data?.message || 'Reset failed', 'err'); }
    setBusy(false);
  };

  return (
    <AuthShell title="Reset your password" sub="We'll issue a 6-digit reset code for your account.">
      {step === 1 ? (
        <form onSubmit={requestCode} className="stack">
          <Field label="Account email"><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></Field>
          <Btn type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset code'}</Btn>
        </form>
      ) : (
        <form onSubmit={doReset} className="stack">
          {devToken && <p className="dev-hint">Dev mode — your reset code is <b>{devToken}</b> (email delivery hooks in with nodemailer in production)</p>}
          <Field label="Reset code"><input className="input otp" maxLength={6} required value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} /></Field>
          <Field label="New password"><input className="input" type="password" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Field>
          <Btn type="submit" disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</Btn>
        </form>
      )}
      <p className="auth-alt"><Link to="/login" className="link">← Back to sign in</Link></p>
    </AuthShell>
  );
}