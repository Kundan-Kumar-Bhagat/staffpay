import { createContext, useContext, useEffect, useState } from 'react';
import api, { storage } from '../api/client';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (storage.get('sp_access')) {
        try { const { data } = await api.get('/auth/me'); setUser(data); }
        catch { storage.clear(); }
      }
      setLoading(false);
    })();
  }, []);

  const applySession = (data, remember) => {
    storage.set('sp_access', data.access, remember);
    storage.set('sp_refresh', data.refresh, remember);
    setUser(data.user);
  };
  const logout = () => { storage.clear(); setUser(null); };

  return <AuthCtx.Provider value={{ user, loading, applySession, logout, setUser }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);