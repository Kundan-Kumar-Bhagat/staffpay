export const dstr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const currentMonth = () => dstr().slice(0, 7);

export const prevMonth = (month, n = 1) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthName = month => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export function workingDaysIn(month, days = [1, 2, 3, 4, 5, 6]) {
  const [y, m] = month.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  let c = 0;
  for (let d = 1; d <= total; d++) if (days.includes(new Date(y, m - 1, d).getDay())) c++;
  return c;
}

export const fmtMoney = (n, currency = 'INR') =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US',
    { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(n || 0);

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

export const invoiceTotals = inv => {
  const subtotal = (inv.items || []).reduce((s, i) => s + i.qty * i.rate, 0);
  const discount = inv.discount || 0;
  const taxable = subtotal - discount;
  const tax = taxable * (inv.taxRate || 0) / 100;
  return { subtotal, discount, taxable, tax, total: taxable + tax };
};