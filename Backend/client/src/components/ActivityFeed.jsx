import { useEffect, useState } from 'react';
import api from '../api/client';
import { Icon } from './ui';
import { timeAgo } from '../utils/format';

const ICONS = { checkin: 'clock', checkout: 'clock', mark: 'cal', payslip: 'doc', invoice: 'invoice', user: 'users', login: 'users', leave: 'leave' };

export default function ActivityFeed({ limit = 8 }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get(`/activity?limit=${limit}`).then(r => setRows(r.data)).catch(() => { });
  }, [limit]);
  return (
    <div className="mini-list">
      {rows.map(a => (
        <div key={a._id} className="mini-row">
          <span className="act-ico"><Icon name={ICONS[a.action] || 'grid'} size={14} /></span>
          <span className="act-text"><b>{a.actor?.name || 'System'}</b> {a.detail}</span>
          <span className="muted act-time">{timeAgo(a.createdAt)}</span>
        </div>
      ))}
      {!rows.length && <p className="muted">No recent activity.</p>}
    </div>
  );
}