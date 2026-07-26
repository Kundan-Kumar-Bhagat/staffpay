import { useEffect, useState } from 'react';
import api from '../api/client';
import { Icon, useToast } from './ui';
import { getQueue, clearQueue } from '../utils/offline';

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(getQueue().length);
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const count = () => setPending(getQueue().length);
    const flush = async () => {
      setOnline(true);
      const q = getQueue();
      if (!q.length) return;
      setSyncing(true);
      for (const item of q) {
        try {
          const { data } = await api.post(`/attendance/${item.type}`);
          toast(`Synced — ${data.message}`);
        } catch (e) {
          toast(e.response?.data?.message || `Could not sync queued ${item.type}`, 'err');
        }
      }
      clearQueue();
      setSyncing(false);
    };
    const off = () => setOnline(false);
    window.addEventListener('online', flush);
    window.addEventListener('offline', off);
    window.addEventListener('sp-queue', count);
    return () => {
      window.removeEventListener('online', flush);
      window.removeEventListener('offline', off);
      window.removeEventListener('sp-queue', count);
    };
  }, []);

  if (online) return null;
  return (
    <div className="offline-bar">
      <Icon name="wifioff" size={15} />
      {syncing ? 'Back online — syncing queued actions…'
        : pending ? `You're offline — ${pending} action${pending > 1 ? 's' : ''} queued, will sync automatically`
        : "You're offline — check-ins will be queued and synced automatically"}
    </div>
  );
}
