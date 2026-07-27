import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Btn, useToast } from '../components/ui';
import { money, applyAccent } from '../utils/format';
import { useCompany } from '../context/CompanyContext';

export default function Verify() {
  const { company } = useCompany();
  const toast = useToast();
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { applyAccent(result?.valid ? result.brand?.accent : null); return () => applyAccent(null); }, [result]);

  const check = async e => {
    e.preventDefault(); setBusy(true); setResult(null);
    const q = encodeURIComponent(serial.trim());
    try {
      if (serial.trim().toUpperCase().startsWith('PV-')) {
        const { data } = await api.get(`/vouchers/verify/${q}`);
        setResult(data);
      } else {
        const { data } = await api.get(`/payslips/verify/${q}`);
        setResult(data);
      }
    } catch (err) {
      setResult({ valid: false, message: err.response?.data?.message || 'Lookup failed' });
    }
    setBusy(false);
  };

  return (
    <div className="verify-wrap">
      <div className="verify-card">
        <div className="verify-brand">
          {result?.brand?.logoUrl ? <img className="auth-logo" src={result.brand.logoUrl} alt="" /> : <span className="logo-mark">SP</span>}
          <div><strong>{company?.name || 'StaffPay'}</strong><span>Document Verification Portal</span></div>
        </div>
        <h1>Check a payslip or voucher is genuine</h1>
        <p className="auth-sub">Enter the reference number printed at the top-right, e.g. <b className="mono">PSL-202606-003</b> or <b className="mono">PV-2026-001</b>.</p>

        <form onSubmit={check} className="verify-form">
          <input className="input mono" required value={serial} onChange={e => setSerial(e.target.value)} placeholder="PSL-YYYYMM-000 or PV-YYYY-000" />
          <Btn type="submit" disabled={busy}>{busy ? 'Checking…' : 'Verify'}</Btn>
        </form>

        {result && (result.valid ? (
          <div className="verify-result ok">
            <span className="verify-stamp">✓ VERIFIED {result.kind?.toUpperCase()}</span>
            <div className="verify-grid">
              <div><span>Issued by</span><b>{result.company}</b></div>
              <div><span>Reference no.</span><b className="mono">{result.serial || result.number}</b></div>
              {result.kind === 'payslip' ? (
                <>
                  <div><span>Pay period</span><b>{result.month}</b></div>
                  <div><span>Employee</span><b>{result.employee}</b></div>
                  <div><span>Employee ID</span><b className="mono">{result.employeeId}</b></div>
                  <div><span>Designation</span><b>{result.designation || '—'}</b></div>
                  <div><span>Issuance mode</span><b>{result.source === 'manual' ? `Manual (${result.issuedBy || 'management'})` : 'Automated'}</b></div>
                  <div><span>Net pay on record</span><b className="mono">{money(+result.net, company?.currency)}</b></div>
                </>
              ) : (
                <>
                  <div><span>Payee</span><b>{result.payee}</b></div>
                  <div><span>Work description</span><b>{result.description}</b></div>
                  <div><span>Payment mode</span><b>{result.paymentMode?.toUpperCase()}</b></div>
                  <div><span>Net payable</span><b className="mono">{money(+result.net, company?.currency)}</b></div>
                </>
              )}
            </div>
            <p className="muted">Record last updated {new Date(result.issuedAt).toLocaleString('en-GB')}. If any detail disagrees with the document you hold, treat it as suspicious and contact {company?.email || 'HR'}.</p>
          </div>
        ) : (
          <div className="verify-result bad">
            <span className="verify-stamp bad">✗ NOT FOUND</span>
            <p>{result.message}</p>
          </div>
        ))}

        <p className="auth-alt"><Link className="link" to="/login">← Staff sign in</Link></p>
      </div>
    </div>
  );
}
