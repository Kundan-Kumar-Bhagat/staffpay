import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const Ctx = createContext({ company: null, reload: () => { } });

export function CompanyProvider({ children }) {
  const [company, setCompany] = useState(null);
  const reload = useCallback(() => { api.get('/company').then(r => setCompany(r.data)).catch(() => { }); }, []);
  useEffect(() => { reload(); }, [reload]);
  return <Ctx.Provider value={{ company, reload }}>{children}</Ctx.Provider>;
}
export const useCompany = () => useContext(Ctx);