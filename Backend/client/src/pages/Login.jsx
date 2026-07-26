import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, Btn, Field } from '../components/ui';

export function AuthShell({ title, sub, children }) {
  return (
    <div className="auth-wrap">
      <aside className="auth-brand">
        <div className="brand-row"><span className="logo-mark">SP</span><span className="brand-name">StaffPay</span></div>
        <h1 className="auth-head">Hours in.<br />Payslips out.<br /><em>Zero fuss.</em></h1>
        <LiveClock />
        <FloorFeed />
        <ul className="auth-chips">
          <li>Authentic PDF payslips</li><li>Excel exports</li><li>Role-based access</li><li>One-tap sharing</li>
        </ul>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="auth-sub">{sub}</p>
          {children}
        </div>
        <p className="auth-verify">Recruiter or bank? <Link to="/verify" className="link">Verify a payslip's authenticity</Link></p>
      </main>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="auth-clock">
      <strong>{now.toLocaleTimeString('en-GB')}</strong>
      <span>{now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
    </div>
  );
}

const FEED = [
  ['09:02', 'Rohan Gupta', 'checked in'], ['09:05', 'Sneha Iyer', 'checked in'],
  ['09:11', 'Ananya Rao', 'checked in'], ['09:41', 'Kabir Khan', 'checked in — late'],
  ['10:02', 'Vikram Singh', 'on leave'], ['13:30', 'Priya Sharma', 'approved 3 payslips'],
];
function FloorFeed() {
  const rows = [...FEED, ...FEED];
  return (
    <div className="feed"><ul>
      {rows.map(([t, name, act], i) => (
        <li key={i}><span className="feed-time">{t}</span><strong>{name}</strong> {act}</li>
      ))}
    </ul></div>
  );
}

export default function Login() {
  const { applySession } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState('password');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [form, setForm] = useState({ id: '', password: '', phone: '', otp: '' });
  const googleRef = useRef();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!cid) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (window.google?.accounts?.id) {
        clearInterval(t);
        window.google.accounts.id.initialize({
          client_id: cid,
          callback: async resp => {
            try {
              const { data } = await api.post('/auth/google', { credential: resp.credential });
              applySession(data, true); toast('Signed in with Google'); nav('/');
            } catch (e) { toast(e.response?.data?.message || 'Google sign-in failed', 'err'); }
          },
        });
        if (googleRef.current) window.google.accounts.id.renderButton(googleRef.current, { theme: 'outline', size: 'large', width: 360 });
      } else if (tries > 25) clearInterval(t);
    }, 300);
    return () => clearInterval(t);
  }, []);

  const submitPassword = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { ...form, remember });
      applySession(data, remember); toast(`Welcome back`); nav('/');
    } catch (e) { toast(e.response?.data?.message || 'Login failed', 'err'); }
    setBusy(false);
  };

  const sendOtp = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post('/auth/phone/request', { phone: form.phone });
      setOtpSent(true);
      if (data.devOtp) setDevOtp(data.devOtp);
      toast(data.message);
    } catch (e) { toast(e.response?.data?.message || 'Could not send OTP', 'err'); }
    setBusy(false);
  };

  const verifyOtp = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post('/auth/phone/verify', { phone: form.phone, otp: form.otp });
      applySession(data, true); toast('Phone verified — welcome'); nav('/');
    } catch (e) { toast(e.response?.data?.message || 'Verification failed', 'err'); }
    setBusy(false);
  };

  return (
    <AuthShell title="Sign in to your workspace" sub="Attendance, payroll and invoices — one console.">
      <div className="tabs">
        <button className={tab === 'password' ? 'on' : ''} onClick={() => setTab('password')}>Email / Password</button>
        <button className={tab === 'phone' ? 'on' : ''} onClick={() => setTab('phone')}>Phone OTP</button>
      </div>

      {tab === 'password' ? (
        <form onSubmit={submitPassword} className="stack">
          <Field label="Email or phone"><input className="input" required value={form.id} onChange={set('id')} placeholder="you@company.com" /></Field>
          <Field label="Password"><input className="input" type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" /></Field>
          <div className="row-between">
            <label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me</label>
            <Link to="/forgot" className="link">Forgot password?</Link>
          </div>
          <Btn type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Btn>
        </form>
      ) : (
        <form onSubmit={otpSent ? verifyOtp : sendOtp} className="stack">
          <Field label="Phone number">
            <input className="input" required value={form.phone} onChange={set('phone')} placeholder="+91 98XXX XXXXX" disabled={otpSent} />
          </Field>
          {otpSent && (
            <>
              <Field label="6-digit OTP">
                <input className="input otp" maxLength={6} required value={form.otp} onChange={set('otp')} placeholder="••••••" />
              </Field>
              {devOtp && <p className="dev-hint">Dev mode — your OTP is <b>{devOtp}</b> (wire Twilio in .env for real SMS)</p>}
              <button type="button" className="link" onClick={() => { setOtpSent(false); setDevOtp(''); }}>Change number / resend</button>
            </>
          )}
          <Btn type="submit" disabled={busy}>{busy ? 'Please wait…' : otpSent ? 'Verify & sign in' : 'Send OTP'}</Btn>
        </form>
      )}

      <div className="divider"><span>or continue with</span></div>
      <div className="google-slot" ref={googleRef} />
      {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <p className="dev-hint">Add <b>VITE_GOOGLE_CLIENT_ID</b> in client/.env to enable Google sign-in.</p>
      )}
      <p className="auth-alt">New here? <Link to="/signup" className="link">Create an account</Link></p>
    </AuthShell>
  );
}