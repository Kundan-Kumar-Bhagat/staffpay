import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Icon } from './ui';
import { timeAgo } from '../utils/format';

const KIND_ICON = { payslip: 'doc', leave: 'leave', attendance: 'clock', system: 'grid' };

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef();
  const nav = useNavigate();

  const load = () => {
    api.get('/notification?limit=12').then(r => setRows(r.data)).catch(() => {});
    api.get('/notification/unread-count').then(r => setUnread(r.data.count)).catch(() => {});
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => { clearInterval(t); document.removeEventListener('mousedown', h); };
  }, []);

  const openItem = async n => {
    if (!n.read) await api.put(`/notification/${n._id}/read`).catch(() => {});
    setOpen(false);
    if (n.link) nav(n.link);
    load();
  };

  const readAll = async () => {
    await api.put('/notification/read-all').catch(() => {});
    load();
  };

  return (
    <div className="bell-wrap" ref={ref}>
      <button className="icon-btn" title="Notifications" onClick={() => setOpen(o => !o)}>
        <Icon name="bell" />
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <b>Notifications</b>
            {unread > 0 && <button onClick={readAll}>Mark all read</button>}
          </div>
          <div className="notif-list">
            {!rows.length && <div className="notif-empty">Nothing yet — payslip and leave updates land here.</div>}
            {rows.map(n => (
              <div key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => openItem(n)}>
                <span className="notif-ico"><Icon name={KIND_ICON[n.kind] || 'grid'} size={15} /></span>
                <div className="notif-body">
                  <b>{n.title}</b>
                  <p>{n.body}</p>
                  <span>{timeAgo(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
