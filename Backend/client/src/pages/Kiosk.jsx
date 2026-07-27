import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const kapi = axios.create({ baseURL: '/api/kiosk' });
kapi.interceptors.request.use(cfg => {
  const t = sessionStorage.getItem('sp_kiosk');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

function Keypad({ onDigit, onBack, onGo, goLabel }) {
  return (
    <div className="keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
        <button key={d} className="key" onClick={() => onDigit(d)}>{d}</button>
      ))}
      <button className="key key-fn" onClick={onBack}>⌫</button>
      <button className="key" onClick={() => onDigit('0')}>0</button>
      <button className="key key-go" onClick={onGo}>{goLabel || '✓'}</button>
    </div>
  );
}

export default function Kiosk() {
  const [stage, setStage] = useState('code');      // code | main | in | out | name | flash
  const [entry, setEntry] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [site, setSite] = useState('');
  const [company, setCompany] = useState('');
  const [today, setToday] = useState({ rows: [], onSite: 0, total: 0 });
  const [now, setNow] = useState(new Date());
  const [flash, setFlash] = useState(null);        // { type:'ok'|'err', msg }
  const [pendingPhone, setPendingPhone] = useState('');
  const [nameInput, setNameInput] = useState('');
  const idleRef = useRef(null);

  // clock
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // keep the screen awake while plugged in at the gate
  useEffect(() => {
    let wl;
    const req = async () => { try { wl = await navigator.wakeLock?.request('screen'); } catch {} };
    req();
    document.addEventListener('visibilitychange', req);
    return () => { wl?.release?.(); document.removeEventListener('visibilitychange', req); };
  }, []);

  // poll who's on site
  useEffect(() => {
    if (stage === 'code') return;
    const load = () => kapi.get('/today').then(r => setToday(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [stage]);

  // idle → re-lock after 90s
  useEffect(() => {
    const reset = () => {
      clearTimeout(idleRef.current);
      if (stage !== 'code') idleRef.current = setTimeout(lock, 90000);
    };
    window.addEventListener('pointerdown', reset);
    reset();
    return () => { clearTimeout(idleRef.current); window.removeEventListener('pointerdown', reset); };
  }, [stage]);

  const lock = () => { sessionStorage.removeItem('sp_kiosk'); setStage('code'); setEntry(''); setCodeErr(''); };

  const tryUnlock = async val => {
    try {
      const { data } = await axios.post('/api/kiosk/unlock', { code: val });
      sessionStorage.setItem('sp_kiosk', data.token);
      setSite(data.siteName); setCompany(data.company);
      setEntry(''); setCodeErr(''); setStage('main');
    } catch { setCodeErr('Invalid code — ask your supervisor'); setEntry(''); }
  };

  const doFlash = (type, msg) => { setFlash({ type, msg }); setStage('flash'); setEntry(''); setTimeout(() => { setStage('main'); setFlash(null); }, 3200); };

  const doCheckin = async (phone, name) => {
    try { const { data } = await kapi.post('/checkin', { phone, name }); doFlash('ok', `${data.name} is IN · ${data.time}${data.status === 'late' ? ' · late' : ''}`); }
    catch (e) { doFlash('err', e.response?.data?.message || 'Check-in failed'); }
  };
  const doCheckout = async phone => {
    try { const { data } = await kapi.post('/checkout', { phone }); doFlash('ok', `${data.name} is OUT · ${data.hours}h logged`); }
    catch (e) { doFlash('err', e.response?.data?.message || 'Check-out failed'); }
  };

  const submitPhone = async mode => {
    const phone = entry;
    if (phone.length < 10) return;
    if (mode === 'in') {
      const lk = await kapi.get('/lookup', { params: { phone } }).catch(() => ({ data: {} }));
      if (lk.data.checkedIn) return doFlash('err', `${lk.data.name || 'Worker'} is already checked in`);
      if (lk.data.name) return doCheckin(phone, lk.data.name);
      setPendingPhone(phone); setNameInput(''); setStage('name');
    } else {
      doCheckout(phone);
    }
  };

  const digit = d => setEntry(e => (e.length >= 10 ? e : e + d));
  const back = () => setEntry(e => e.slice(0, -1));

  return (
    <div className="kiosk">
      <div className="kiosk-top">
        <div className="kiosk-brand"><span className="logo-mark">SP</span><div><b>{company || 'StaffPay'}</b><span>{site || 'Gate kiosk'}</span></div></div>
        <span className="kiosk-badge">KIOSK</span>
      </div>

      {stage === 'code' && (
        <div className="kiosk-center">
          <h1 className="kiosk-title">Enter site code</h1>
          <div className={`code-dots ${codeErr ? 'shake' : ''}`}>
            {Array.from({ length: 6 }).map((_, i) => <span key={i} className={i < entry.length ? 'fill' : ''} />)}
          </div>
          {codeErr && <p className="kiosk-err">{codeErr}</p>}
          <Keypad onDigit={d => { const v = entry + d; setEntry(v); if (v.length === 6) tryUnlock(v); }} onBack={back} goLabel="↺" onGo={() => setEntry('')} />
          <Link to="/login" className="kiosk-staff">Staff sign in →</Link>
        </div>
      )}

      {stage === 'main' && (
        <div className="kiosk-main">
          <div className="kiosk-clock"><strong>{now.toLocaleTimeString('en-GB')}</strong><span>{now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
          <div className="kiosk-onsite"><b>{today.onSite}</b><span>on site now · {today.total} today</span></div>
          <div className="kiosk-actions">
            <button className="tap tap-in pulse" onClick={() => { setEntry(''); setStage('in'); }}><span className="tap-arrow">↓</span>CHECK IN</button>
            <button className="tap tap-out" onClick={() => { setEntry(''); setStage('out'); }}><span className="tap-arrow">↑</span>CHECK OUT</button>
          </div>
          <div className="kiosk-feed">
            {today.rows.slice(0, 8).map(r => (
              <span key={r._id} className="feed-chip"><b>{r.checkIn}</b> {r.name} {r.checkOut ? `out ${r.checkOut}` : 'in'}</span>
            ))}
            {!today.rows.length && <span className="feed-chip">No taps yet today</span>}
          </div>
        </div>
      )}

      {(stage === 'in' || stage === 'out') && (
        <div className="kiosk-center">
          <h1 className="kiosk-title">{stage === 'in' ? 'Check in — enter your phone number' : 'Check out — enter your phone number'}</h1>
          <div className="phone-display mono">{entry || <span className="ph">your 10-digit number</span>}</div>
          <Keypad onDigit={digit} onBack={back} goLabel="GO" onGo={() => submitPhone(stage)} />
          <button className="kiosk-back" onClick={() => { setStage('main'); setEntry(''); }}>← Back</button>
        </div>
      )}

      {stage === 'name' && (
        <div className="kiosk-center">
          <h1 className="kiosk-title">First time here — your name?</h1>
          <input className="kiosk-name" autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Full name" />
          <button className="tap tap-in name-go" disabled={nameInput.trim().length < 2} onClick={() => doCheckin(pendingPhone, nameInput.trim())}>CONFIRM CHECK IN</button>
          <button className="kiosk-back" onClick={() => { setStage('main'); setEntry(''); }}>← Back</button>
        </div>
      )}

      {stage === 'flash' && flash && (
        <div className={`kiosk-flash ${flash.type}`}>
          <span className="flash-mark">{flash.type === 'ok' ? '✓' : '✕'}</span>
          <p>{flash.msg}</p>
        </div>
      )}
    </div>
  );
}
