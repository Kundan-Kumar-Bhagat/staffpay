import { useEffect, useState, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { Icon, RoleBadge, useToast } from './ui';
import { initials } from '../utils/format';
import NotificationsBell from './Notifications';
import OfflineBanner from './OfflineBanner';
import api from '../api/client';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'grid', roles: ['admin', 'manager', 'staff'] },
  { to: '/attendance', label: 'Attendance', icon: 'clock', roles: ['admin', 'manager', 'staff'] },
  { to: '/leave', label: 'Leave', icon: 'leave', roles: ['admin', 'manager', 'staff'] },
  { to: '/calendar', label: 'Calendar Report', icon: 'cal', roles: ['admin', 'manager', 'staff'] },
  { to: '/payslips', label: 'Payslips', icon: 'doc', roles: ['admin', 'manager', 'staff'] },
  { to: '/invoices', label: 'Invoices', icon: 'invoice', roles: ['admin', 'manager'] },
  { to: '/reports', label: 'Reports', icon: 'chart', roles: ['admin', 'manager'] },
  { to: '/staff', label: 'Staff', icon: 'users', roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: 'gear', roles: ['admin'] },
  { to: '/workspaces', label: 'Workspaces', icon: 'grid', roles: ['admin'], super: true },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="topbar-clock">
      <strong>{now.toLocaleTimeString('en-GB')}</strong>
      <span>{now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
    </div>
  );
}

function WorkspaceSwitcher() {
  const { user, setUser } = useAuth();
  const { reload } = useCompany();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState([]);
  const ref = useRef();
  useEffect(() => {
    api.get('/workspaces').then(r => setAll(r.data)).catch(() => {});
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const switchTo = async id => {
    const { data } = await api.post(`/workspaces/${id}/switch`);
    setUser(data.user); reload(); setOpen(false);
    toast(`Now working in ${data.user.workspaceInfo.name}`);
  };
  return (
    <div className="ws-switch" ref={ref}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
        <Icon name="grid" size={14} /> {user.workspaceInfo?.name?.split(' ')[0] || 'Workspace'} ▾
      </button>
      {open && (
        <div className="ws-menu">
          <div className="ws-menu-head">Switch workspace</div>
          {all.map(ws => (
            <button key={ws._id} className={`ws-item ${String(ws._id) === String(user.workspaceInfo?.id) ? 'current' : ''}`} onClick={() => switchTo(ws._id)}>
              <b>{ws.name}</b>
              <span>{ws.staff} staff · <i className={`plan-chip plan-${ws.plan}`}>{ws.plan}</i></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const items = NAV.filter(n => n.roles.includes(user.role) && (!n.super || user.superAdmin));
  const title = items.find(i => i.to === loc.pathname)?.label || 'My Profile';

  return (
    <div className="shell">
      <div className={`backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="side-brand">
          <span className="logo-mark">SP</span>
          <div>
            <strong>StaffPay</strong>
            <span className="side-ws">{user.workspaceInfo?.name || 'No workspace'} <i className={`plan-chip plan-${user.workspaceInfo?.plan}`}>{user.workspaceInfo?.plan}</i></span>
          </div>
        </div>
        <nav className="side-nav">
          {items.map(i => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon name={i.icon} size={17} /> {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <span className="side-foot-label">Reporting manager</span>
          <strong>{company?.managerName || '—'}</strong>
          <span>{company?.managerTitle}</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <div className="topbar-title"><h2>{title}</h2><span>{company?.name}</span></div>
          {user.superAdmin && <WorkspaceSwitcher />}
          <Clock />
          <NotificationsBell />
          <button className="userchip" onClick={() => nav('/profile')}>
            <span className="avatar" style={{ background: user.color || '#0F3D33' }}>{initials(user.name)}</span>
            <span className="userchip-meta"><strong>{user.name}</strong><RoleBadge role={user.role} /></span>
          </button>
          <button className="icon-btn" title="Sign out" onClick={() => { logout(); nav('/login'); }}><Icon name="out" /></button>
        </header>
        <OfflineBanner />
        <main className="page"><Outlet /></main>
      </div>
    </div>
  );
}