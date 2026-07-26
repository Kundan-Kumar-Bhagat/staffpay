import cron from 'node-cron';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payslip from '../models/Payslip.js';
import Workspace, { companyView } from '../models/Workspace.js';
import { runInTenant } from '../utils/tenantContext.js';
import { sendMail } from '../services/mail.service.js';
import { dstr, currentMonth, fmtMoney } from '../utils/helpers.js';

export async function buildDigest() {
  const company = companyView({});
  const today = dstr();
  const month = currentMonth();
  const [staff, todayAtt, pending, slips, monthAtt] = await Promise.all([
    User.find({ status: 'active', role: { $ne: 'admin' } }),
    Attendance.find({ date: today }).populate('user', 'name'),
    Leave.find({ status: 'pending' }).populate('user', 'name'),
    Payslip.find({ month }),
    Attendance.find({ date: { $regex: `^${month}` } }),
  ]);

  const markedIds = new Set(todayAtt.map(a => String(a.user._id)));
  const unmarked = staff.filter(s => !markedIds.has(String(s._id)));
  const out = todayAtt.filter(a => ['absent', 'leave'].includes(a.status));
  const late = todayAtt.filter(a => a.status === 'late');
  const ok = monthAtt.filter(a => ['present', 'late', 'half'].includes(a.status)).length;

  const stats = {
    date: today, month,
    headcount: staff.length,
    marked: todayAtt.length,
    unmarked: unmarked.length,
    out: out.length,
    late: late.length,
    pending: pending.length,
    slips: slips.length,
    net: slips.reduce((s, p) => s + p.net, 0),
    rate: monthAtt.length ? Math.round((ok / monthAtt.length) * 100) : 0,
  };

  const row = (label, value, color = '#0D1F1B') =>
    `<tr><td style="padding:8px 14px;border-bottom:1px solid #E4E9E5;color:#5B6B64;font-size:13px">${label}</td>
      <td align="right" style="padding:8px 14px;border-bottom:1px solid #E4E9E5;font-family:'Courier New',monospace;font-weight:700;color:${color};font-size:13px;white-space:nowrap">${value}</td></tr>`;
  const list = (title, items, color) => items.length
    ? `<p style="margin:16px 0 4px;font-size:10px;letter-spacing:1.2px;color:#5B6B64;font-weight:700">${title}</p>
       <p style="margin:0;font-size:13px;color:${color};line-height:1.5">${items.join(' &nbsp;·&nbsp; ')}</p>` : '';

  const html = `
  <div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border:1px solid #D8DED9;border-radius:10px;overflow:hidden;background:#fff">
    <div style="background:#0F3D33;padding:22px 24px;border-bottom:4px solid #E8A23C">
      <div style="color:#fff;font-size:20px;font-weight:800">${company.name || 'StaffPay'}</div>
      <div style="color:#C7DAD1;font-size:12px;margin-top:3px">Monday manager digest — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    <div style="padding:14px 14px 4px">
      <table width="100%" style="border-collapse:collapse;border:1px solid #E4E9E5;border-radius:8px">
        ${row('Active headcount', stats.headcount)}
        ${row('Marked in so far today', `${stats.marked} / ${stats.headcount}`)}
        ${row('Attendance rate this month', stats.rate + '%', '#1C6B47')}
        ${row(`Payslips issued (${month})`, `${stats.slips} &nbsp;•&nbsp; ${fmtMoney(stats.net, company.currency)}`)}
        ${row('Leave requests awaiting decision', stats.pending, stats.pending ? '#8F621F' : '#0D1F1B')}
      </table>
      ${list(`OUT TODAY — ${out.length}`, out.map(a => a.user?.name || '—'), '#A33030')}
      ${list(`LATE TODAY — ${late.length}`, late.map(a => a.user?.name || '—'), '#8F621F')}
      ${list(`NOT MARKED YET — ${unmarked.length}`, unmarked.map(u => u.name), '#0D1F1B')}
    </div>
    <div style="margin-top:18px;padding:14px 24px;background:#EEF3EF;color:#5B6B64;font-size:11px">
      Sent automatically by StaffPay every Monday at 07:30. Open the console for the full picture — reports, calendar and approvals.
    </div>
  </div>`;

  return { html, stats, subject: `Monday digest — ${stats.out} out, ${stats.pending} approvals waiting` };
}

export async function sendDigest() {
  let sent = 0, recipients = 0;
  for (const ws of await Workspace.find({ status: 'active' })) {
    await runInTenant(ws._id, async () => {
      const { html, subject } = await buildDigest();
      const managers = await User.find({ role: { $in: ['admin', 'manager'] }, status: 'active' });
      const to = managers.map(m => m.email).filter(Boolean);
      recipients += to.length;
      for (const addr of to) if (await sendMail({ to: addr, subject, html })) sent++;
    });
  }
  return { sent, recipients };
}

export function startDigestJob() {
  if (process.env.DIGEST !== 'true') {
    console.log('◇ Monday digest disabled (set DIGEST=true to enable)');
    return;
  }
  cron.schedule('30 7 * * 1', async () => {
    const out = await sendDigest();
    console.log(`✓ Digest sent to ${out.sent}/${out.recipients} managers`);
  });
  console.log('◆ Manager digest scheduled — Mondays 07:30');
}
