import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { PageHead, Btn, useToast, Reveal, Spinner, Icon, useCountUp } from '../components/ui';

const STATUS_TONE = { trialing: 'st-late', active: 'st-present', demo: 'st-leave', past_due: 'st-absent', canceled: 'st-absent', expired: 'st-absent' };

function Meter({ label, used, cap, tone = 'var(--pine)' }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);
  const pct = cap ? Math.min(100, (used / cap) * 100) : 8;
  return (
    <div className="meter">
      <div className="meter-head"><span>{label}</span><b className="mono">{used}{cap ? ` / ${cap}` : ''}</b></div>
      <div className="meter-track"><i style={{ width: on ? `${pct}%` : '0%', background: pct > 85 ? 'var(--red)' : tone }} /></div>
    </div>
  );
}

export default function Billing() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [u, setU] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/billing/usage').then(r => setU(r.data));
  useEffect(() => {
    load();
    if (params.get('upgraded')) toast('Welcome to Pro — your subscription is live');
  }, []);

  const slips = useCountUp(u?.slipsAll || 0);
  const isTrial = u?.plan === 'trial';
  const low = isTrial && u.trialDaysLeft <= 3;

  const upgrade = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/billing/checkout');
      if (data.url) window.location.href = data.url;
      else { toast(data.message, 'ok'); load(); }
    } catch (e) { toast(e.response?.data?.message || 'Checkout failed', 'err'); }
    setBusy(false);
  };

  const manage = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/billing/portal');
      if (data.url) window.location.href = data.url;
      else toast(data.message, 'err');
    } catch { toast('Portal unavailable', 'err'); }
    setBusy(false);
  };

  const changeSeats = async n => {
    try { const { data } = await api.put('/billing/seats', { seats: n }); toast(`Seats set to ${data.seats}`); load(); }
    catch (e) { toast(e.response?.data?.message || 'Failed', 'err'); }
  };

  if (!u) return <Spinner />;
  return (
    <>
      <PageHead title="Billing" sub={u.live ? 'Powered by Stripe — test card 4242 4242 4242 4242' : 'Simulation mode — add Stripe keys in server/.env to go live'} />

      <Reveal>
        <div className="bill-hero">
          <div>
            <span className="stat-label">Current plan</span>
            <div className="bill-plan">
              <strong>{u.plan === 'pro' ? 'Pro' : 'Trial'}</strong>
              <span className={`pill ${STATUS_TONE[u.status]} bill-status`}>{u.status}</span>
            </div>
            <span className="bill-sub">
              {isTrial
                ? <>Ends in <b className={low ? 'low' : ''}>{u.trialDaysLeft} day{u.trialDaysLeft === 1 ? '' : 's'}</b> · {new Date(u.trialEndsAt).toLocaleDateString('en-GB')}</>
                : <>Renews {u.renewsAt ? new Date(u.renewsAt).toLocaleDateString('en-GB') : '—'} · {u.seats} seat{u.seats > 1 ? 's' : ''}</>}
            </span>
          </div>
          <div className="bill-cta">
            {isTrial
              ? <Btn variant="amber" onClick={upgrade} disabled={busy} className="pulse">{busy ? 'Opening checkout…' : `Upgrade — ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: u.currency, maximumFractionDigits: 0 }).format(u.price)}/mo`}</Btn>
              : <Btn variant="ghost" onClick={manage} disabled={busy}>Manage subscription</Btn>}
          </div>
        </div>
      </Reveal>

      <div className="bill-grid">
        <Reveal delay={80}>
          <div className="card stack">
            <h3 className="card-title">Usage this cycle</h3>
            <Meter label="Staff seats in use" used={u.staff} cap={u.seatLimit || u.seats} />
            <Meter label="Payslips this month" used={u.slipsMonth} tone="var(--teal)" />
            <div className="bill-total"><span>Payslips issued, all time</span><b className="mono">{slips.toLocaleString()}</b></div>
            {u.plan === 'pro' && (
              <div className="seats-row">
                <Btn variant="ghost" className="btn-sm" onClick={() => changeSeats(u.seats - 1)}>−</Btn>
                <strong className="mono seats-num">{u.seats}</strong>
                <Btn variant="ghost" className="btn-sm" onClick={() => changeSeats(u.seats + 1)}>+</Btn>
                <span className="muted">purchased seats — staff creation blocks at this number</span>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={140}>
          {isTrial ? (
            <div className="card pro-pitch">
              <span className="stat-label">StaffPay Pro</span>
              <div className="price-tag">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: u.currency, maximumFractionDigits: 0 }).format(u.price)}<span>/month</span></div>
              <ul className="pitch-list">
                <li>Unlimited staff & payslips</li>
                <li>Adjustable purchased seats</li>
                <li>WhatsApp payslip delivery</li>
                <li>Priority support</li>
              </ul>
              <div className="trial-gauge">
                <div className="meter-track"><i style={{ width: `${(u.trialDaysLeft / u.trialLength) * 100}%`, background: low ? 'var(--red)' : 'var(--amber)' }} /></div>
                <span className={low ? 'low' : 'muted'}>{u.trialDaysLeft} of {u.trialLength} trial days remaining</span>
              </div>
              <Btn variant="amber" onClick={upgrade} disabled={busy}>{busy ? 'Opening…' : 'Upgrade now'}</Btn>
            </div>
          ) : (
            <div className="card">
              <h3 className="card-title">Receipts & payment</h3>
              <p className="muted">Cards, invoices and cancellation live in the Stripe customer portal — nothing is stored on our side.</p>
              <Btn variant="ghost" onClick={manage} disabled={busy}><Icon name="doc" size={15} /> Open portal</Btn>
            </div>
          )}
        </Reveal>
      </div>
    </>
  );
}
