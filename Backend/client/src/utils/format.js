import api from '../api/client';

export const dstr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const currentMonth = () => dstr().slice(0, 7);
export const shiftMonth = (month, n) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export const monthLabel = month => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
export const prettyDate = ds => new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
export const money = (n, cur = 'INR') =>
  new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: cur || 'INR', maximumFractionDigits: 0 }).format(n || 0);
export const initials = name => (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = n => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''));
const three = n => (n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? two(n % 100) : '');

export function amountInWords(num, currency = 'INR') {
  num = Math.round(Math.abs(num || 0));
  if (!num) return 'Zero Only';
  let out = '';
  if (currency === 'INR') {
    const cr = Math.floor(num / 1e7), lk = Math.floor((num % 1e7) / 1e5), th = Math.floor((num % 1e5) / 1000), rest = num % 1000;
    if (cr) out += three(cr) + ' Crore ';
    if (lk) out += two(lk) + ' Lakh ';
    if (th) out += two(th) + ' Thousand ';
    if (rest) out += three(rest);
  } else {
    for (const [v, label] of [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']]) {
      if (num >= v) { out += three(Math.floor(num / v)) + ' ' + label + ' '; num %= v; }
    }
    if (num) out += three(num);
  }
  return out.trim() + ' Only';
}

export async function downloadUrl(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(res.data);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
export const timeAgo = iso => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const isHex = c => /^#[0-9a-fA-F]{6}$/.test(c || '');
export const shade = (hex, pct) => {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * (1 + pct))));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
};
export const applyAccent = (accent, root = document.documentElement) => {
  if (isHex(accent)) {
    root.style.setProperty('--pine', accent);
    root.style.setProperty('--pine-2', shade(accent, -0.18));
    root.style.setProperty('--pine-3', shade(accent, -0.32));
  } else {
    ['--pine', '--pine-2', '--pine-3'].forEach(v => root.style.removeProperty(v));
  }
};