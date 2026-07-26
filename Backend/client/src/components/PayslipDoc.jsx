import { money, amountInWords } from '../utils/format';
import { STATUS } from './ui';

export default function PayslipDoc({ p, company, user }) {
  const cur = company.currency;
  const o = company.payslip || {};
  const on = k => o[k] !== false;
  const kv = (l, v) => <div className="pslip-kv"><span>{l}</span><strong>{v || '—'}</strong></div>;

  const headLines = [];
  if (on('tagline') && company.tagline) headLines.push(company.tagline);
  if (on('address')) headLines.push(`${company.address}, ${company.city}, ${company.state} ${company.zip}, ${company.country}`);
  if (on('contact')) headLines.push(`${company.phone}   ${company.email}${company.website ? '   ' + company.website : ''}`);
  if (on('taxIds')) headLines.push(`GSTIN: ${company.taxId || '—'}    PF Code: ${company.pfCode || '—'}`);

  return (
    <div className="pslip">
      <header className="pslip-head">
        <div>
          <h3>{company.name}</h3>
          {headLines.map((l, i) => <p key={i}>{l}</p>)}
        </div>
        <div className="pslip-title">
          <strong>PAYSLIP</strong><span>{p.monthName}</span>
          <em>Slip No: {p.serial}</em>
          <em>Generated: {new Date().toLocaleDateString('en-GB')}</em>
        </div>
      </header>

      <section className="pslip-meta">
        {kv('Employee Name', user.name)} {kv('Employee ID', user.employeeId)}
        {kv('Designation', user.designation)} {kv('Department', user.department)}
        {on('statutory') && <>
          {kv('PAN', user.pan)} {kv('PF / UAN No.', user.pfNo)}
          {kv('Bank Account', user.bank?.name ? `${user.bank.name} • ${user.bank.accountNo}` : '—')}
          {kv('Joined On', user.joinDate ? new Date(user.joinDate).toLocaleDateString('en-GB') : '—')}
          {kv('Reporting Manager', company.managerName)} {kv('Work Location', `${company.city}, ${company.country}`)}
        </>}
      </section>

      {on('breakdown') ? (
        <section className="pslip-tables">
          <table>
            <thead><tr><th>Earnings</th><th>Amount</th></tr></thead>
            <tbody>
              <tr><td>Basic Salary</td><td>{money(p.earnings.basic, cur)}</td></tr>
              <tr><td>House Rent Allowance</td><td>{money(p.earnings.hra, cur)}</td></tr>
              <tr><td>Special Allowances</td><td>{money(p.earnings.allowances, cur)}</td></tr>
              <tr><td>Overtime</td><td>{money(p.earnings.overtime, cur)}</td></tr>
              <tr className="total"><td>GROSS EARNINGS</td><td>{money(p.gross, cur)}</td></tr>
            </tbody>
          </table>
          <table>
            <thead><tr><th>Deductions</th><th>Amount</th></tr></thead>
            <tbody>
              <tr><td>Provident Fund</td><td>{money(p.deductions.pf, cur)}</td></tr>
              <tr><td>Income Tax (TDS)</td><td>{money(p.deductions.tax, cur)}</td></tr>
              <tr><td>Absent Deduction</td><td>{money(p.deductions.absent, cur)}</td></tr>
              <tr><td>Unpaid Leave</td><td>{money(p.deductions.unpaidLeave, cur)}</td></tr>
              <tr><td>Advance / Others</td><td>{money(p.deductions.advance, cur)}</td></tr>
              <tr className="total"><td>TOTAL DEDUCTIONS</td><td>{money(p.totalDeductions, cur)}</td></tr>
            </tbody>
          </table>
        </section>
      ) : (
        <section className="pslip-compact">
          <div><span>GROSS EARNINGS</span><b>{money(p.gross, cur)}</b></div>
          <div><span>TOTAL DEDUCTIONS</span><b>−{money(p.totalDeductions, cur)}</b></div>
        </section>
      )}

      <section className="pslip-net">
        <div><span>NET PAY</span><strong>{money(p.net, cur)}</strong></div>
        {on('words') && <div className="right"><span>AMOUNT IN WORDS</span><strong>{amountInWords(p.net, cur)}</strong></div>}
      </section>

      {on('attendanceStrip') && (
        <section className="pslip-days">
          {[['Present', p.days.present], ['Late', p.days.late], ['Half Day', p.days.half], ['Leave', p.days.leave], ['Absent', p.days.absent]].map(([l, v], i) => (
            <div key={l} className="pslip-chip" style={{ borderColor: STATUS[Object.keys(STATUS)[i]][2] }}>
              <strong>{v}</strong><span>{l}</span>
            </div>
          ))}
          <p>Working days: {p.days.working} &nbsp;•&nbsp; Hours logged: {p.days.hours}</p>
        </section>
      )}

      <footer className="pslip-foot">
        <div className="foot-row">
          {on('declaration')
            ? <p className="decl">I hereby acknowledge receipt of this payslip and confirm that the particulars stated above are correct to the best of my knowledge.</p>
            : <span />}
          {on('signature') && (
            <div className="sig">
              <i /><strong>{company.managerName || 'Authorised Signatory'}</strong>
              <span>{company.managerTitle || 'Manager'} — {company.name}</span>
            </div>
          )}
        </div>
        <p className="gen">
          {on('verifyFooter')
            ? <>This is a computer generated payslip issued by {company.name} and does not require a physical signature. Verify authenticity at {location.origin}/verify using slip no. <b>{p.serial}</b>, or contact HR at {company.email}.</>
            : <>This is a computer generated payslip issued by {company.name} and does not require a physical signature.</>}
        </p>
      </footer>
    </div>
  );
}