import { AsyncLocalStorage } from 'node:async_hooks';

export const tenantStorage = new AsyncLocalStorage();
export const runInTenant = (wid, fn) => tenantStorage.run(String(wid), fn);
export const currentTenant = () => tenantStorage.getStore() || null;
