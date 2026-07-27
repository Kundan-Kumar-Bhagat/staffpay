import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../api/client';

/* ── icons ── */
const paths = {
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  doc: <><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>,
  invoice: <><path d="M5 2h14v20l-2.3-1.5-2.3 1.5-2.4-1.5L9.6 22l-2.3-1.5L5 22z" /><path d="M9 8h6M9 12h6" /></>,
  chart: <><path d="M3 21h18" /><path d="M7 21V12M12 21V6M17 21v-8" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16 15.2c2.6.3 4.6 1.8 5.4 4.8" /></>,
  gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></>,
  out: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6" /></>,
  down: <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />,
  chev: <path d="M9 6l6 6-6 6" />,
  leave: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></>,
  wifioff: <><path d="M2 2l20 20" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M5 12.5a10 10 0 0 1 5.2-2.7" /><path d="M12 7c1.6 0 3.1.3 4.5 1" /><path d="M2 8.8C4.7 6.8 7.7 5.5 11 5.1" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
};

export const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
);

/* ── toasts ── */
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ── atoms ── */
export const Btn = ({ children, variant = 'primary', className = '', ...rest }) => (
  <button className={`btn btn-${variant} ${className}`} {...rest}>{children}</button>
);
export const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;
export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button type="button" className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
      <span className="toggle-knob" />
      <span className="toggle-text"><b>{label}</b>{hint && <i>{hint}</i>}</span>
    </button>
  );
}
export const Spinner = () => <div className="spinner" />;
export const Empty = ({ icon = 'doc', title, sub }) => (
  <div className="empty"><Icon name={icon} size={34} /><h4>{title}</h4><p>{sub}</p></div>
);
export const PageHead = ({ title, sub, children }) => (
  <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="page-actions">{children}</div></div>
);

export const STATUS = {
  present: ['Present', 'st-present', '#2E9E6B'],
  late: ['Late', 'st-late', '#E8A23C'],
  absent: ['Absent', 'st-absent', '#D64545'],
  leave: ['Leave', 'st-leave', '#3E7CB1'],
  half: ['Half Day', 'st-half', '#1E8E8E'],
};
export const StatusPill = ({ s }) => <span className={`pill ${STATUS[s]?.[1] || ''}`}>{STATUS[s]?.[0] || '—'}</span>;
export const RoleBadge = ({ role }) => <span className={`role role-${role}`}>{role}</span>;

/* ── stat with count-up ── */
export function useCountUp(target = 0, dur = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf; const t0 = performance.now();
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}
export function Stat({ label, value, sub, isMoney, currency = 'INR' }) {
  const n = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{typeof value === 'number' ? (isMoney ? money(n, currency) : n.toLocaleString()) : value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
const money = (n, cur) => new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: cur || 'INR', maximumFractionDigits: 0 }).format(n || 0);

/* ── modal ── */
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><Icon name="x" /></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ── scroll reveal ── */
export function Reveal({ children, delay = 0 }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

/* ── share menu (native sheet + WhatsApp / Telegram / Email / copy) ── */
export function ShareMenu({ url, filename, title, text }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const native = async () => {
    setOpen(false);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const file = new File([res.data], filename, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        toast('Shared successfully');
        return;
      }
    } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.share({ title, text }); toast('Shared'); }
    catch { toast('File sharing not supported here — use WhatsApp / Email below', 'err'); }
  };
  const enc = encodeURIComponent(text);
  return (
    <div className="share-wrap" ref={ref}>
      <Btn variant="ghost" className="btn-sm" onClick={() => setOpen(o => !o)}><Icon name="share" size={14} /> Share</Btn>
      {open && (
        <div className="share-menu">
          <button onClick={native}>Share file / device apps…</button>
          <button onClick={() => { window.open(`https://wa.me/?text=${enc}`, '_blank'); setOpen(false); }}>WhatsApp</button>
          <button onClick={() => { window.open(`https://t.me/share/url?text=${enc}`, '_blank'); setOpen(false); }}>Telegram</button>
          <button onClick={() => { location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${enc}`; setOpen(false); }}>Email</button>
          <button onClick={async () => { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); setOpen(false); }}>Copy details</button>
        </div>
      )}
    </div>
  );
}