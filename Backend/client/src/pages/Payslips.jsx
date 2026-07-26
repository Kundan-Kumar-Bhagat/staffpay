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

  const cur = company?.currency || 'INR';
  const load = () => api.get('/payslips').then(r => setSlips(r.data));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (isMgr) api.get('/users').then(r => setStaff(r.data.filter(u => u.status === 'active' && u.role !== 'admin'))); }, []);

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

  const dl = async (p, ext) => {
    try { await downloadUrl(`/payslips/${p._id}/${ext}`, `${p.serial}.${ext}`); toast(`${ext.toUpperCase()} downloaded`); }
    catch { toast('Download failed', 'err'); }
  };

  const emailSlip = async p => {
    try { const { data } = await api.post(`/payslips/${p._id}/email`); toast(data.message); }
    catch (e) { toast(e.response?.data?.message || 'Email failed', 'err'); }
  };

  return (
    <>
      <PageHead title="Payslips" sub={isMgr ? 'Generate, preview, export and share authentic payslips.' : 'Your salary statements, ready to download.'} />

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
            <Btn onClick={generate} disabled={busy}><Icon name="doc" size={15} /> {busy ? 'Computing…' : 'Generate'}</Btn>
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

      <Modal open={!!view} onClose={() => setView(null)} title={view ? `Payslip preview — ${view.serial}` : ''} wide>
        {view && company && (
          <>
            <PayslipDoc p={view} company={company} user={view.user} />
            <div className="row-end doc-actions">
              <Btn variant="ghost" onClick={() => dl(view, 'xlsx')}>Download Excel</Btn>
              <Btn variant="ghost" onClick={() => window.print()}>Print</Btn>
              <Btn onClick={() => dl(view, 'pdf')}><Icon name="down" size={15} /> Download PDF</Btn>
              <ShareMenu url={`/payslips/${view._id}/pdf`} filename={`${view.serial}.pdf`} title={`Payslip ${view.serial}`}
                text={`Payslip ${view.serial} — ${view.user?.name}, ${view.monthName}. Net pay ${money(view.net, cur)}.`} />
            </div>
          </>
        )}
      </Modal>
    </>
  );
}