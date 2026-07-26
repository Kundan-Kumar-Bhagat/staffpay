import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'sp_access', REFRESH_KEY = 'sp_refresh';

export const storage = {
  get: k => localStorage.getItem(k) ?? sessionStorage.getItem(k),
  set: (k, v, remember) => {
    (remember ? localStorage : sessionStorage).setItem(k, v);
    (remember ? sessionStorage : localStorage).removeItem(k);
  },
  clear: () => { [TOKEN_KEY, REFRESH_KEY].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); }); },
};

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const t = storage.get(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing = null;
api.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry && storage.get(REFRESH_KEY) && !orig.url.includes('/auth/')) {
    orig._retry = true;
    try {
      refreshing ||= axios.post(`${BASE}/auth/refresh`, { refresh: storage.get(REFRESH_KEY) });
      const { data } = await refreshing;
      refreshing = null;
      storage.set(TOKEN_KEY, data.access, !!localStorage.getItem(REFRESH_KEY));
      orig.headers.Authorization = `Bearer ${data.access}`;
      return api(orig);
    } catch {
      storage.clear();
      window.location.href = '/login';
    }
  }
  return Promise.reject(err);
});

export default api;