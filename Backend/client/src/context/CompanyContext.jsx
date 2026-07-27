import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { applyAccent } from '../utils/format';

const Ctx = createContext({ company: null, reload: () => { } });

export function CompanyProvider({ children }) {
  const [company, setCompany] = useState(null);
  const reload = useCallback(() => { api.get('/company').then(r => setCompany(r.data)).catch(() => { }); }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { applyAccent(company?.brand?.accent); }, [company?.brand?.accent]);
  return <Ctx.Provider value={{ company, reload }}>{children}</Ctx.Provider>;
}
export const useCompany = () => useContext(Ctx);