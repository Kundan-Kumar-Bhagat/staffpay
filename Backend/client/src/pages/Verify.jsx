import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Btn, useToast } from '../components/ui';
import { money } from '../utils/format';
import { useCompany } from '../context/CompanyContext';

export default function Verify() {
  const { company } = useCompany();
  const toast = useToast();
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const check = async e => {
    e.preventDefault(); setBusy(true); setResult(null);
    try {
      const { data } = await api.get(`/payslips/verify/${encodeURIComponent(serial)}`);
      setResult(data);
    } catch (err) {
      setResult({ valid: false, message: err.response?.data?.message || 'Lookup failed' });
    }
    setBusy(false);
  };

  return (
    <div className="verify-wrap">
      <div className="verify-card">
        <div className="verify-brand">
          <span className="logo-mark">SP</span>
          <div><strong>{company?.name || 'StaffPay'}</strong><span>Payslip Verification Portal</span></div>
        </div>
        <h1>Check a payslip is genuine</h1>
        <p className="auth-sub">Enter the slip number printed at the top-right of the document, e.g. <b className="mono">PSL-202606-003</b>.</p>

        <form onSubmit={check} className="verify-form">
          <input className="input mono" required value={serial} onChange={e => setSerial(e.target.value)} placeholder="PSL-YYYYMM-000" />
          <Btn type="submit" disabled={busy}>{busy ? 'Checking…' : 'Verify'}</Btn>
        </form>

        {result && (result.valid ? (
          <div className="verify-result ok">
            <span className="verify-stamp">✓ VERIFIED</span>
            <div className="verify-grid">
              <div><span>Issued by</span><b>{result.company}</b></div>
              <div><span>Slip no.</span><b className="mono">{result.serial}</b></div>
              <div><span>Pay period</span><b>{result.month}</b></div>
              <div><span>Employee</span><b>{result.employee}</b></div>
              <div><span>Employee ID</span><b className="mono">{result.employeeId}</b></div>
              <div><span>Designation</span><b>{result.designation || '—'}</b></div>
              <div><span>Net pay on record</span><b className="mono">{money(+result.net, company?.currency)}</b></div>
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
