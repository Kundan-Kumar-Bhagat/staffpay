import { money, amountInWords } from '../utils/format';

export default function VoucherDoc({ v, company }) {
  const cur = company.currency;
  return (
    <div className="pslip">
      <header className="pslip-head">
        <div>
          {company.brand?.logoUrl && <img className="pslip-logo" src={company.brand.logoUrl} alt="" />}
          <h3>{company.name}</h3>
          <p>{company.address}, {company.city}, {company.state} {company.zip}</p>
          <p>{company.phone}   {company.email}</p>
          {company.taxId && <p>GSTIN: {company.taxId}</p>}
        </div>
        <div className="pslip-title">
          <strong>PAYMENT VOUCHER</strong>
          <span style={{ color: 'var(--amber)' }}>{v.number}</span>
          <em>Status: {v.status.toUpperCase()}</em>
          <em>Mode: {v.paymentMode.toUpperCase()}</em>
        </div>
      </header>

      <section className="pslip-meta">
        <div className="pslip-kv"><span>Paid To</span><strong>{v.payee?.name || '—'}</strong></div>
        <div className="pslip-kv"><span>Phone</span><strong>{v.payee?.phone || '—'}</strong></div>
        <div className="pslip-kv"><span>ID Details</span><strong>{v.payee?.idType ? `${v.payee.idType}: ${v.payee.idNumber || '—'}` : '—'}</strong></div>
        <div className="pslip-kv"><span>Date</span><strong>{new Date(v.createdAt).toLocaleDateString('en-GB')}</strong></div>
      </section>

      <section className="pslip-tables">
        <table>
          <thead><tr><th>Description of Work / Service</th><th>Qty</th><th>Rate</th><th>Gross Amount</th></tr></thead>
          <tbody>
            <tr>
              <td>{v.description}</td>
              <td className="mono">{v.qty}</td>
              <td className="mono">{money(v.rate, cur)}</td>
              <td className="mono"><b>{money(v.amount, cur)}</b></td>
            </tr>
          </tbody>
        </table>
      </section>

      {(v.deductions?.tds || v.deductions?.advance || v.deductions?.other) ? (
        <section className="pslip-tables" style={{ marginTop: '10px' }}>
          <table>
            <thead><tr><th>Deductions</th><th>Amount</th></tr></thead>
            <tbody>
              {v.deductions.tds > 0 && <tr><td>Less: TDS</td><td className="mono">−{money(v.deductions.tds, cur)}</td></tr>}
              {v.deductions.advance > 0 && <tr><td>Less: Advance</td><td className="mono">−{money(v.deductions.advance, cur)}</td></tr>}
              {v.deductions.other > 0 && <tr><td>Less: Others</td><td className="mono">−{money(v.deductions.other, cur)}</td></tr>}
            </tbody>
          </table>
        </section>
      ) : null}

      <div className="pslip-net">
        <div>
          <span>NET PAYABLE</span>
          <strong>{money(v.net, cur)}</strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span>AMOUNT IN WORDS</span>
          <p style={{ color: '#fff', fontSize: '12px', marginTop: '2px' }}>{amountInWords(v.net, cur)}</p>
        </div>
      </div>

      <footer className="pslip-foot">
        <p>This is a payment voucher for contractual / casual / one-time work and does not constitute employment or a salary relationship. Verify authenticity online at {company.website || 'our StaffPay portal'}/verify using voucher no. {v.number}.</p>
      </footer>
    </div>
  );
}
