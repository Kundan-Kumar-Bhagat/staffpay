import cron from 'node-cron';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { computeAndSavePayslip } from '../services/payroll.service.js';
import { payslipPDF, pdfBuffer } from '../services/pdf.service.js';
import { sendMail } from '../services/mail.service.js';
import { fmtMoney, prevMonth, currentMonth } from '../utils/helpers.js';
import { logActivity } from '../utils/log.js';
import { notify } from '../utils/notify.js';

export async function runPayroll(month, { email = true } = {}) {
  const company = await Company.findOne();
  const users = await User.find({ status: 'active', role: { $in: ['staff', 'manager'] } });
  let generated = 0, mailed = 0;

  for (const u of users) {
    const slip = await computeAndSavePayslip(u, month, company, null);
    generated++;
    notify(u, 'payslip', 'Payslip issued', `Your payslip ${slip.serial} for ${slip.monthName} is ready — net ${fmtMoney(slip.net, company?.currency)}.`, '/payslips');
    if (email && u.email) {
      try {
        const pdf = await pdfBuffer(payslipPDF(slip, company, u));
        const sent = await sendMail({
          to: u.email,
          subject: `Your payslip for ${slip.monthName} — ${company?.name || 'StaffPay'}`,
          text: `Hi ${u.name},\n\nYour payslip (${slip.serial}) for ${slip.monthName} is ready.\nNet pay: ${fmtMoney(slip.net, company?.currency)}.\n\nVerify it anytime at the verification portal using your slip number.\n\n${company?.name || ''}`,
          attachments: [{ filename: `${slip.serial}.pdf`, content: pdf }],
        });
        if (sent) mailed++;
      } catch (e) { console.error(`✗ Mail failed for ${u.email}:`, e.message); }
    }
  }
  logActivity(null, 'payslip', `auto-payroll ran for ${month} — ${generated} slips generated, ${mailed} emailed`);
  return { generated, mailed };
}

export function startJobs() {
  if (process.env.AUTO_PAYROLL !== 'true') {
    console.log('◇ Auto-payroll disabled (set AUTO_PAYROLL=true to enable)');
    return;
  }
  // 06:00 on the 1st of every month → close the previous month
  cron.schedule('0 6 1 * *', async () => {
    const month = prevMonth(currentMonth());
    console.log(`▶ Auto-payroll starting for ${month}`);
    const out = await runPayroll(month, { email: true });
    console.log(`✓ Auto-payroll done — ${out.generated} generated, ${out.mailed} emailed`);
  });
  console.log('◆ Auto-payroll scheduled — 06:00 on the 1st of each month');
}
