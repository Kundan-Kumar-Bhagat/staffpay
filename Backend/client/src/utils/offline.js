const KEY = 'sp_offline_queue';

export const getQueue = () => JSON.parse(localStorage.getItem(KEY) || '[]');

export const queueAction = action => {
  const q = getQueue();
  q.push({ ...action, queuedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new Event('sp-queue'));
};

export const clearQueue = () => {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('sp-queue'));
};
