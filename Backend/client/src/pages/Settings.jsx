import { useEffect, useState } from 'react';
import api from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { PageHead, Btn, Field, useToast, Reveal, Toggle, Modal } from '../components/ui';
import PayslipDoc from '../components/PayslipDoc';
import { monthLabel, currentMonth, downloadUrl, dstr } from '../utils/format';

import { useAuth } from '../context/AuthContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function IntegRow({ ok, label, hint, okLabel = 'connected', offLabel = 'off', onTest, testing }) {
  return (
    <div className={`integ-row ${ok ? 'ok' : ''}`}>
      <span className="integ-dot" />
      <div className="integ-meta"><b>{label}</b><span>{hint}</span></div>
      <span className={`pill ${ok ? 'st-present' : 'st-late'}`}>{ok ? okLabel : offLabel}</span>
      {onTest && ok && <Btn type="button" variant="ghost" className="btn-sm" onClick={onTest} disabled={testing}>{testing ? 'Sending…' : 'Test'}</Btn>}
    </div>
  );
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const { company, reload } = useCompany();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [rotating, setRotating] = useState(false);
  const rotate = async () => {
    setRotating(true);
    try {
      const { data } = await api.post('/workspaces/join-code/rotate');
      setUser({ ...user, workspaceInfo: { ...user.workspaceInfo, joinCode: data.joinCode } });
      toast('New join code issued — the old one stops working');
    } catch { toast('Rotation failed', 'err'); }
    setRotating(false);
  };
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sample, setSample] = useState(null);
  const [integrations, setIntegrations] = useState(null);
  const [waTesting, setWaTesting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [drag, setDrag] = useState(false);
  const PRESETS = ['#0F3D33', '#14532D', '#134E4A', '#1E3A5F', '#713F12', '#7F1D1D', '#1C1917'];
  const setBrand = (k, v) => setForm(f => ({ ...f, brand: { ...f.brand, [k]: v } }));

  const uploadLogo = async file => {
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const { data } = await api.post('/company/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBrand('logoUrl', data.logoUrl);
      reload();
      toast('Logo uploaded — visible on the console and PDFs');
    } catch (e) { toast(e.response?.data?.message || 'Upload failed (PNG/JPG/WebP/SVG, ≤ 400 KB)', 'err'); }
  };
  const removeLogo = async () => {
    await api.delete('/company/logo').catch(() => {});
    setBrand('logoUrl', undefined); reload(); toast('Logo removed');
  };

  useEffect(() => {
    api.get('/company/integrations').then(r => setIntegrations(r.data)).catch(() => {});
  }, []);

  const testWa = async () => {
    setWaTesting(true);
    try { const { data } = await api.post('/company/integrations/test-whatsapp'); toast(data.message, data.ok ? 'ok' : 'err'); }
    catch (e) { toast(e.response?.data?.message || 'Test failed', 'err'); }
    setWaTesting(false);
  };

  const backup = async () => {
    setBackingUp(true);
    try {
      await downloadUrl('/reports/backup', `staffpay-backup-${dstr().replaceAll('-', '')}.json`);
      toast('Backup downloaded — store it somewhere safe');
    } catch { toast('Backup failed', 'err'); }
    setBackingUp(false);
  };

  useEffect(() => {
    Promise.all([api.get('/payslips'), api.get('/users')]).then(([ps, us]) => {
      const slip = ps.data[0];
      const u = slip?.user || us.data.find(x => x.role !== 'admin') || { name: 'Sample Employee', employeeId: 'EMP-000' };
      setSample(slip ? { ...slip, user: u } : {
        serial: 'PSL-PREVIEW-001', monthName: monthLabel(currentMonth()),
        earnings: { basic: 40000, hra: 16000, allowances: 8000, overtime: 0 },
        deductions: { pf: 4800, tax: 3200, absent: 0, unpaidLeave: 0, advance: 0 },
        gross: 64000, totalDeductions: 8000, net: 56000,
        days: { working: 26, present: 22, late: 2, half: 1, leave: 1, absent: 0, hours: 176 },
        user: u,
      });
    }).catch(() => {});
  }, []);

  const payOn = k => form?.payslip?.[k] !== false;
  const invOn = k => form?.invoice?.[k] !== false;
  const setPay = (k, v) => setForm(f => ({ ...f, payslip: { ...f.payslip, [k]: v } }));
  const setInv = (k, v) => setForm(f => ({ ...f, invoice: { ...f.invoice, [k]: v } }));
  const setQuota = (k, v) => setForm(f => ({ ...f, leaveQuotas: { ...f.leaveQuotas, [k]: +v } }));

  useEffect(() => { if (company && !form) setForm({ ...company }); }, [company]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setNum = k => e => setForm(f => ({ ...f, [k]: +e.target.value }));
  const toggleDay = d => setForm(f => ({ ...f, workingDays: f.workingDays.includes(d) ? f.workingDays.filter(x => x !== d) : [...f.workingDays, d].sort() }));

  const save = async e => {
    e.preventDefault(); setBusy(true);
    try { await api.put('/company', form); reload(); toast('Company settings saved — payslips will use these details'); }
    catch (e2) { toast(e2.response?.data?.message || 'Save failed', 'err'); }
    setBusy(false);
  };

  if (!form) return null;
  return (
    <>
      <PageHead title="Settings" sub="Company identity, payroll rules and working schedule. Every payslip carries these details." />
      <Reveal>
        <form onSubmit={save} className="card stack settings-form">
          <h4 className="sect">Workspace</h4>
          <div className="ws-panel">
            <div className="integ-meta">
              <b>{user.workspaceInfo?.name} <i className={`plan-chip plan-${user.workspaceInfo?.plan}`}>{user.workspaceInfo?.plan}</i></b>
              <span>Share the join code — new signups land in this workspace as staff</span>
            </div>
            <div className="join-code">
              <code>{user.workspaceInfo?.joinCode || '—'}</code>
              <Btn type="button" variant="ghost" className="btn-sm" onClick={() => { navigator.clipboard.writeText(user.workspaceInfo?.joinCode || ''); toast('Join code copied'); }}>Copy</Btn>
              <Btn type="button" variant="ghost" className="btn-sm" onClick={rotate} disabled={rotating}>{rotating ? '…' : 'Rotate'}</Btn>
            </div>
          </div>

          <h4 className="sect">Company identity (printed on payslips & invoices)</h4>
          <div className="grid-3">
            <Field label="Company name"><input className="input" required value={form.name} onChange={set('name')} /></Field>
            <Field label="Tagline"><input className="input" value={form.tagline || ''} onChange={set('tagline')} /></Field>
            <Field label="Website"><input className="input" value={form.website || ''} onChange={set('website')} /></Field>
            <Field label="Address"><input className="input" value={form.address || ''} onChange={set('address')} /></Field>
            <Field label="City"><input className="input" value={form.city || ''} onChange={set('city')} /></Field>
            <Field label="State"><input className="input" value={form.state || ''} onChange={set('state')} /></Field>
            <Field label="PIN / ZIP"><input className="input" value={form.zip || ''} onChange={set('zip')} /></Field>
            <Field label="Country"><input className="input" value={form.country || ''} onChange={set('country')} /></Field>
            <Field label="Phone"><input className="input" value={form.phone || ''} onChange={set('phone')} /></Field>
            <Field label="HR email"><input className="input" value={form.email || ''} onChange={set('email')} /></Field>
            <Field label="GSTIN / Tax ID"><input className="input" value={form.taxId || ''} onChange={set('taxId')} /></Field>
            <Field label="PF code"><input className="input" value={form.pfCode || ''} onChange={set('pfCode')} /></Field>
          </div>

          <h4 className="sect">Brand — console, login page & payslip letterhead</h4>
          <div className="brand-panel">
            <label
              className={`dropzone ${drag ? 'over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); uploadLogo(e.dataTransfer.files[0]); }}>
              {form.brand?.logoUrl
                ? <img src={form.brand.logoUrl} className="brand-preview" alt="Logo preview" />
                : <span>Drop your logo here<br /><i>or click to browse — square works best</i></span>}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e => uploadLogo(e.target.files[0])} />
            </label>
            <div className="brand-side">
              <Field label="Accent color">
                <div className="swatches">
                  {PRESETS.map(c => (
                    <button type="button" key={c} className={`swatch ${form.brand?.accent === c ? 'on' : ''}`}
                      style={{ background: c }} title={c} onClick={() => setBrand('accent', c)} />
                  ))}
                  <input type="color" className="color-input" value={form.brand?.accent || '#0F3D33'} onChange={e => setBrand('accent', e.target.value)} />
                  <code>{form.brand?.accent || 'default pine'}</code>
                </div>
              </Field>
              <p className="muted brand-hint">Applies to the sidebar, buttons, your subdomain login page and the PDF letterhead the moment you save — no redeploys.</p>
              {form.brand?.logoUrl && <Btn type="button" variant="danger-ghost" className="btn-sm" onClick={removeLogo}>Remove logo</Btn>}
            </div>
          </div>

          <h4 className="sect">Manager (signatory on payslips)</h4>
          <div className="grid-3">
            <Field label="Manager name"><input className="input" value={form.managerName || ''} onChange={set('managerName')} /></Field>
            <Field label="Manager title"><input className="input" value={form.managerTitle || ''} onChange={set('managerTitle')} /></Field>
            <Field label="Currency">
              <select className="input" value={form.currency} onChange={set('currency')}>
                {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <h4 className="sect">Payroll rules</h4>
          <div className="grid-3">
            <Field label="Work starts (late after)"><input className="input" type="time" value={form.workStart} onChange={set('workStart')} /></Field>
            <Field label="PF rate %"><input className="input" type="number" value={form.pfRate} onChange={setNum('pfRate')} /></Field>
            <Field label="Flat tax / TDS %"><input className="input" type="number" value={form.taxRate} onChange={setNum('taxRate')} /></Field>
          </div>
          <Field label="Working days">
            <div className="day-picks">
              {DAYS.map((d, i) => (
                <button type="button" key={d} className={`day-pick ${form.workingDays.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>{d}</button>
              ))}
            </div>
          </Field>
          <Field label="Holidays (paid, excluded from working-day count)">
            <div className="holiday-picks">
              {(form.holidays || []).map(h => (
                <span key={h} className="holiday-chip">{h}
                  <button type="button" title="Remove" onClick={() => setForm(f => ({ ...f, holidays: f.holidays.filter(x => x !== h) }))}>×</button>
                </span>
              ))}
              <input type="date" className="input input-sm" onChange={e => {
                if (!e.target.value) return;
                setForm(f => ({ ...f, holidays: [...new Set([...(f.holidays || []), e.target.value])].sort() }));
                e.target.value = '';
              }} />
            </div>
          </Field>

          <h4 className="sect">Payslip document — what gets printed</h4>
          <div className="toggle-grid">
            <Toggle checked={payOn('tagline')} onChange={v => setPay('tagline', v)} label="Tagline" hint="One-liner under the company name" />
            <Toggle checked={payOn('address')} onChange={v => setPay('address', v)} label="Registered address" hint="Street, city, state, PIN" />
            <Toggle checked={payOn('contact')} onChange={v => setPay('contact', v)} label="Contact line" hint="Phone · email · website" />
            <Toggle checked={payOn('taxIds')} onChange={v => setPay('taxIds', v)} label="GSTIN & PF code" hint="Statutory IDs in the header" />
            <Toggle checked={payOn('statutory')} onChange={v => setPay('statutory', v)} label="Employee statutory block" hint="PAN, PF/UAN, bank, manager, location" />
            <Toggle checked={payOn('breakdown')} onChange={v => setPay('breakdown', v)} label="Earnings & deductions tables" hint="Off = compact gross/net summary" />
            <Toggle checked={payOn('words')} onChange={v => setPay('words', v)} label="Net pay in words" hint="Amount-in-words line" />
            <Toggle checked={payOn('attendanceStrip')} onChange={v => setPay('attendanceStrip', v)} label="Attendance strip" hint="Present / late / leave chips" />
            <Toggle checked={payOn('declaration')} onChange={v => setPay('declaration', v)} label="Employee declaration" hint="Acknowledgement paragraph" />
            <Toggle checked={payOn('signature')} onChange={v => setPay('signature', v)} label="Manager signature block" hint="Name + title sign-off" />
            <Toggle checked={payOn('verifyFooter')} onChange={v => setPay('verifyFooter', v)} label="Verification footer" hint="Points to the /verify portal" />
          </div>

          <h4 className="sect">Invoice document</h4>
          <div className="toggle-grid">
            <Toggle checked={invOn('taxIds')} onChange={v => setInv('taxIds', v)} label="GSTIN" hint="Tax ID in the header" />
            <Toggle checked={invOn('bank')} onChange={v => setInv('bank', v)} label="Bank details" hint="Payment account block" />
            <Toggle checked={invOn('words')} onChange={v => setInv('words', v)} label="Total in words" hint="Amount in words" />
            <Toggle checked={invOn('notes')} onChange={v => setInv('notes', v)} label="Notes" hint="Per-invoice notes line" />
          </div>

          <h4 className="sect">Leave quotas (days per year)</h4>
          <div className="grid-3">
            <Field label="Casual"><input className="input" type="number" min="0" value={form.leaveQuotas?.casual ?? 12} onChange={e => setQuota('casual', e.target.value)} /></Field>
            <Field label="Sick"><input className="input" type="number" min="0" value={form.leaveQuotas?.sick ?? 8} onChange={e => setQuota('sick', e.target.value)} /></Field>
            <Field label="Unpaid"><input className="input" type="number" min="0" value={form.leaveQuotas?.unpaid ?? 30} onChange={e => setQuota('unpaid', e.target.value)} /></Field>
          </div>

          <h4 className="sect">Integrations</h4>
          {integrations ? (
            <div className="integ-grid">
              <IntegRow ok={integrations.email} label="Email (SMTP)" hint="Reset codes • payslip & invoice delivery" />
              <IntegRow ok={integrations.sms} label="SMS (Twilio)" hint="Phone OTP login" />
              <IntegRow ok={integrations.whatsapp} label="WhatsApp Business" hint="Staff alerts • payslip PDFs on payday" onTest={testWa} testing={waTesting} />
              <IntegRow ok={integrations.autoPayroll} label="Auto-payroll" hint="Closes the month on the 1st at 06:00" okLabel="armed" offLabel="off" />
            </div>
          ) : <p className="muted">Loading integration status…</p>}

          <h4 className="sect">Company bank (printed on invoices)</h4>
          <div className="grid-3">
            <Field label="Bank name"><input className="input" value={form.bank?.name || ''} onChange={e => setForm(f => ({ ...f, bank: { ...f.bank, name: e.target.value } }))} /></Field>
            <Field label="Account no."><input className="input" value={form.bank?.accountNo || ''} onChange={e => setForm(f => ({ ...f, bank: { ...f.bank, accountNo: e.target.value } }))} /></Field>
            <Field label="IFSC / SWIFT"><input className="input" value={form.bank?.ifsc || ''} onChange={e => setForm(f => ({ ...f, bank: { ...f.bank, ifsc: e.target.value } }))} /></Field>
          </div>

          <h4 className="sect">Data & backup</h4>
          <div className="backup-row">
            <div className="integ-meta">
              <b>Full workspace export</b>
              <span>Users, attendance, payslips, invoices & leave — one JSON snapshot, passwords excluded</span>
            </div>
            <Btn type="button" variant="ghost" onClick={backup} disabled={backingUp}>{backingUp ? 'Preparing…' : 'Download backup'}</Btn>
          </div>

          <div className="row-end">
            <Btn type="button" variant="ghost" onClick={() => setPreview(true)}>Preview payslip</Btn>
            <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Btn>
          </div>
        </form>
      </Reveal>
      <Modal open={preview} onClose={() => setPreview(false)} title="Live preview — unsaved toggles apply" wide>
        {sample && <PayslipDoc p={sample} company={form} user={sample.user} />}
      </Modal>
    </>
  );
}