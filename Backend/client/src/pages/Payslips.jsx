import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { PageHead, Btn, Field, Modal, useToast, Icon, Reveal, Empty, Spinner, ShareMenu } from '../components/ui';
import PayslipDoc from '../components/PayslipDoc';
import { currentMonth, downloadUrl, money } from '../utils/format';

export default function Payslips() {
  const { user } = useAuth();
  const { company } = useCompany();
  const toast = useToast();
  const isMgr = user.role !== 'staff';
  const [slips, setSlips] = useState(null);
  const [staff, setStaff] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [staffId, setStaffId] = useState('all');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);

  // Manual custom override modal state
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: '', month: currentMonth(),
    basic: 40000, hra: 16000, allowances: 8000, overtime: 0,
    pf: 4800, tax: 3200, absent: 0, unpaidLeave: 0, advance: 0,
    working: 26, present: 26, late: 0, absentDays: 0, leave: 0, half: 0, hours: 208,
  });

  const cur = company?.currency || 'INR';
  const load = () => api.get('/payslips').then(r => setSlips(r.data));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (isMgr) {
      api.get('/users').then(r => {
        const activeStaff = r.data.filter(u => u.status === 'active' && u.role !== 'admin');
        setStaff(activeStaff);
        if (activeStaff.length) setManualForm(f => ({ ...f, userId: activeStaff[0]._id }));
      });
    }
  }, [isMgr]);

  const generate = async () => {
    setBusy(true);
    try {
      const { data } = staffId === 'all'
        ? await api.post('/payslips/generate-all', { month })
        : await api.post('/payslips/generate', { userId: staffId, month });
      toast(data.message || 'Payslip generated');
      load();
    } catch (e) { toast(e.response?.data?.message || 'Generation failed', 'err'); }
    setBusy(false);
  };

  const generateManual = async e => {
    e.preventDefault();
    if (!manualForm.userId) return toast('Select a staff member', 'err');
    setBusy(true);
    try {
      const payload = {
        userId: manualForm.userId,
        month: manualForm.month,
        earnings: { basic: manualForm.basic, hra: manualForm.hra, allowances: manualForm.allowances, overtime: manualForm.overtime },
        deductions: { pf: manualForm.pf, tax: manualForm.tax, absent: manualForm.absent, unpaidLeave: manualForm.unpaidLeave, advance: manualForm.advance },
        days: { working: manualForm.working, present: manualForm.present, late: manualForm.late, absent: manualForm.absentDays, leave: manualForm.leave, half: manualForm.half, hours: manualForm.hours },
      };
      const { data } = await api.post('/payslips/generate', payload);
      toast(`Manual payslip ${data.serial} generated`);
      setManualOpen(false);
      load();
    } catch (e) { toast(e.response?.data?.message || 'Manual generation failed', 'err'); }
    setBusy(false);
  };

  const dl = async (p, ext) => {
    try { await downloadUrl(`/payslips/${p._id}/${ext}`, `${p.serial}.${ext}`); toast(`${ext.toUpperCase()} downloaded`); }
    catch { toast('Download failed', 'err'); }
  };

  const emailSlip = async p => {
    try { const { data } = await api.post(`/payslips/${p._id}/email`); toast(data.message); }
    catch (e) { toast(e.response?.data?.message || 'Email failed', 'err'); }
  };

  const setMf = (k, v) => setManualForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <PageHead title="Payslips" sub={isMgr ? 'Generate, preview, export and share authentic payslips.' : 'Your salary statements, ready to download.'}>
        {isMgr && (
          <Btn variant="amber" onClick={() => setManualOpen(true)}><Icon name="plus" size={15} /> Create Custom Payslip / Bill</Btn>
        )}
      </PageHead>

      {isMgr && (
        <Reveal>
          <div className="card gen-card">
            <Field label="Pay period"><input type="month" className="input" value={month} onChange={e => setMonth(e.target.value)} /></Field>
            <Field label="Staff member">
              <select className="input" value={staffId} onChange={e => setStaffId(e.target.value)}>
                <option value="all">Everyone (bulk run)</option>
                {staff.map(s => <option key={s._id} value={s._id}>{s.name} — {s.employeeId}</option>)}
              </select>
            </Field>
            <Btn onClick={generate} disabled={busy}><Icon name="doc" size={15} /> {busy ? 'Computing…' : 'Auto Generate'}</Btn>
          </div>
        </Reveal>
      )}

      <Reveal delay={80}>
        <div className="card">
          <h3 className="card-title">{isMgr ? 'All payslips' : 'My payslips'}</h3>
          {slips === null ? <Spinner /> : !slips.length ? (
            <Empty icon="doc" title="No payslips yet" sub={isMgr ? 'Pick a month above and hit Generate.' : 'Your manager hasn’t run payroll yet.'} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Slip no.</th>{isMgr && <th>Staff</th>}<th>Period</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Actions</th></tr></thead>
                <tbody>
                  {slips.map(p => (
                    <tr key={p._id}>
                      <td className="mono">{p.serial}</td>
                      {isMgr && <td><b>{p.user?.name}</b> <span className="muted mono">{p.user?.employeeId}</span></td>}
                      <td>{p.monthName}</td>
                      <td className="mono">{money(p.gross, cur)}</td>
                      <td className="mono muted">−{money(p.totalDeductions, cur)}</td>
                      <td className="mono"><b>{money(p.net, cur)}</b></td>
                      <td>
                        <div className="row-actions">
                          <Btn variant="ghost" className="btn-sm" onClick={() => setView(p)}>View</Btn>
                          <Btn variant="ghost" className="btn-sm" onClick={() => dl(p, 'pdf')}><Icon name="down" size={13} /> PDF</Btn>
                          <Btn variant="ghost" className="btn-sm" onClick={() => dl(p, 'xlsx')}>Excel</Btn>
                          <Btn variant="ghost" className="btn-sm" onClick={() => emailSlip(p)}>Email</Btn>
                          <ShareMenu url={`/payslips/${p._id}/pdf`} filename={`${p.serial}.pdf`} title={`Payslip ${p.serial}`}
                            text={`Payslip ${p.serial} — ${p.user?.name}, ${p.monthName}. Net pay ${money(p.net, cur)}. Open in StaffPay: ${location.origin}/payslips`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>

      {/* ── Manual Custom Payslip / Bill Modal ── */}
      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Create Custom Payslip / Bill" wide>
        <form onSubmit={generateManual} className="stack">
          <div className="grid-2">
            <Field label="Staff Member">
              <select className="input" required value={manualForm.userId} onChange={e => setMf('userId', e.target.value)}>
                {staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.employeeId})</option>)}
              </select>
            </Field>
            <Field label="Pay Period">
              <input type="month" className="input" required value={manualForm.month} onChange={e => setMf('month', e.target.value)} />
            </Field>
          </div>

          <h4 className="sect">Earnings ({cur})</h4>
          <div className="grid-4">
            <Field label="Basic Salary"><input type="number" className="input" value={manualForm.basic} onChange={e => setMf('basic', +e.target.value)} /></Field>
            <Field label="HRA"><input type="number" className="input" value={manualForm.hra} onChange={e => setMf('hra', +e.target.value)} /></Field>
            <Field label="Allowances"><input type="number" className="input" value={manualForm.allowances} onChange={e => setMf('allowances', +e.target.value)} /></Field>
            <Field label="Overtime / Bonus"><input type="number" className="input" value={manualForm.overtime} onChange={e => setMf('overtime', +e.target.value)} /></Field>
          </div>

          <h4 className="sect">Deductions ({cur})</h4>
          <div className="grid-3">
            <Field label="Provident Fund (PF)"><input type="number" className="input" value={manualForm.pf} onChange={e => setMf('pf', +e.target.value)} /></Field>
            <Field label="Income Tax (TDS)"><input type="number" className="input" value={manualForm.tax} onChange={e => setMf('tax', +e.target.value)} /></Field>
            <Field label="Advance / Loan Repayment"><input type="number" className="input" value={manualForm.advance} onChange={e => setMf('advance', +e.target.value)} /></Field>
            <Field label="Absent Deduction"><input type="number" className="input" value={manualForm.absent} onChange={e => setMf('absent', +e.target.value)} /></Field>
            <Field label="Unpaid Leave Deduction"><input type="number" className="input" value={manualForm.unpaidLeave} onChange={e => setMf('unpaidLeave', +e.target.value)} /></Field>
          </div>

          <div className="ws-panel" style={{ background: 'var(--soft)', marginTop: '8px' }}>
            <div>
              <b>Calculated Net Pay: </b>
              <strong style={{ fontSize: '18px', color: 'var(--pine)' }}>
                {money(
                  (+manualForm.basic + +manualForm.hra + +manualForm.allowances + +manualForm.overtime) -
                  (+manualForm.pf + +manualForm.tax + +manualForm.advance + +manualForm.absent + +manualForm.unpaidLeave),
                  cur
                )}
              </strong>
            </div>
            <Btn type="submit" disabled={busy}>{busy ? 'Issuing…' : 'Generate & Issue Custom Payslip'}</Btn>
          </div>
        </form>
      </Modal>

      {/* ── View / Print Modal ── */}
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `Payslip preview — ${view.serial}` : ''} wide>
        {view && company && (
          <>
            <PayslipDoc p={view} company={company} user={view.user} />
            <div className="row-end doc-actions">
              <Btn variant="ghost" onClick={() => dl(view, 'xlsx')}>Download Excel</Btn>
              <Btn variant="ghost" onClick={() => window.print()}>Print</Btn>
              <Btn onClick={() => dl(view, 'pdf')}><Icon name="down" size={15} /> Download PDF</Btn>
              <ShareMenu url={`/payslips/${view._id}/pdf`} filename={`${p => p.serial}.pdf`} title={`Payslip ${view.serial}`}
                text={`Payslip ${view.serial} — ${view.user?.name}, ${view.monthName}. Net pay ${money(view.net, cur)}.`} />
            </div>
          </>
        )}
      </Modal>
    </>
  );
}