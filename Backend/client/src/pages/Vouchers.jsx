import { useEffect, useState } from 'react';
import api from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { PageHead, Btn, Field, Modal, useToast, Icon, Reveal, Empty, ShareMenu } from '../components/ui';
import VoucherDoc from '../components/VoucherDoc';
import { downloadUrl, money } from '../utils/format';

const V_STATUS = { draft: ['Draft', 'st-late'], approved: ['Approved', 'st-leave'], paid: ['Paid', 'st-present'] };
const blank = () => ({
  name: '', phone: '', idType: 'Aadhaar', idNumber: '', address: '',
  description: '', from: '', to: '', qty: 1, rate: 0, amount: '',
  tds: 0, advance: 0, other: 0, paymentMode: 'cash', note: '',
});

export default function Vouchers() {
  const { company } = useCompany();
  const toast = useToast();
  const cur = company?.currency || 'INR';
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [view, setView] = useState(null);
  const [f, setF] = useState(blank());
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/vouchers').then(r => setRows(r.data));
  useEffect(() => { load(); }, []);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const gross = f.amount !== '' && f.amount != null ? +f.amount : (+f.qty || 0) * (+f.rate || 0);
  const net = gross - (+f.tds || 0) - (+f.advance || 0) - (+f.other || 0);

  const save = async issue => {
    if (!f.name || !f.description) return toast('Payee name and a work description are required', 'err');
    setBusy(true);
    try {
      await api.post('/vouchers', {
        payee: { name: f.name, phone: f.phone, idType: f.idType, idNumber: f.idNumber, address: f.address },
        description: f.description, from: f.from, to: f.to, qty: +f.qty, rate: +f.rate,
        amount: f.amount === '' ? undefined : +f.amount,
        deductions: { tds: +f.tds, advance: +f.advance, other: +f.other },
        paymentMode: f.paymentMode, note: f.note, issue,
      });
      toast(issue ? 'Voucher approved & issued' : 'Draft voucher saved');
      setModal(false); setF(blank()); load();
    } catch (e) { toast(e.response?.data?.message || 'Failed', 'err'); }
    setBusy(false);
  };

  const act = async (v, kind) => {
    try { await api.put(`/vouchers/${v._id}/${kind}`); toast(kind === 'approve' ? 'Voucher approved' : 'Marked as paid'); load(); }
    catch (e) { toast(e.response?.data?.message || 'Failed', 'err'); }
  };
  const dl = async v => {
    try { await downloadUrl(`/vouchers/${v._id}/pdf`, `${v.number}.pdf`); toast('PDF downloaded'); }
    catch { toast('Download failed', 'err'); }
  };

  return (
    <>
      <PageHead title="Pay Vouchers" sub="One-time payments for contractors, labour & casual workers — not employees, no PF, full audit trail.">
        <Btn variant="amber" onClick={() => { setF(blank()); setModal(true); }}><Icon name="plus" size={15} /> Issue Payment Voucher</Btn>
      </PageHead>

      <Reveal>
        <div className="card">
          <h3 className="card-title">Issued vouchers</h3>
          {rows === null ? <Empty icon="doc" title="Loading..." sub="" /> : !rows.length ? (
            <Empty icon="doc" title="No payment vouchers yet" sub="Issue a voucher for one-time labour, contractor milestones, or daily wages." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Voucher no.</th><th>Payee</th><th>Description</th><th>Gross</th><th>Net payable</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.map(v => (
                    <tr key={v._id}>
                      <td className="mono">{v.number}</td>
                      <td><b>{v.payee?.name}</b>{v.payee?.phone ? <><br /><span className="muted mono">{v.payee.phone}</span></> : ''}</td>
                      <td>{v.description}</td>
                      <td className="mono">{money(v.amount, cur)}</td>
                      <td className="mono"><b>{money(v.net, cur)}</b></td>
                      <td><span className={`pill ${V_STATUS[v.status]?.[1]}`}>{V_STATUS[v.status]?.[0]}</span></td>
                      <td>
                        <div className="row-actions">
                          <Btn variant="ghost" className="btn-sm" onClick={() => setView(v)}>View</Btn>
                          {v.status === 'draft' && <Btn className="btn-sm" onClick={() => act(v, 'approve')}>Approve</Btn>}
                          {v.status === 'approved' && <Btn variant="amber" className="btn-sm" onClick={() => act(v, 'paid')}>Mark Paid</Btn>}
                          <Btn variant="ghost" className="btn-sm" onClick={() => dl(v)}><Icon name="down" size={13} /> PDF</Btn>
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

      <Modal open={modal} onClose={() => setModal(false)} title="Issue Payment Voucher — contractors & casual workers" wide>
        <div className="stack">
          <h4 className="sect">Payee identity</h4>
          <div className="grid-3">
            <Field label="Full name *"><input className="input" required value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ramesh Kumar" /></Field>
            <Field label="Phone"><input className="input" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+919876543210" /></Field>
            <Field label="ID document"><input className="input" value={f.idNumber} onChange={e => set('idNumber', e.target.value)} placeholder="Aadhaar / PAN / Voter ID" /></Field>
          </div>

          <h4 className="sect">Work & payment</h4>
          <Field label="Description of work / service *">
            <input className="input" required value={f.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Electrical wiring — Floor 2 renovation milestone 1" />
          </Field>
          <div className="grid-3">
            <Field label="Quantity / Days"><input type="number" min="1" className="input" value={f.qty} onChange={e => set('qty', +e.target.value)} /></Field>
            <Field label={`Rate per unit (${cur})`}><input type="number" min="0" className="input" value={f.rate} onChange={e => set('rate', +e.target.value)} /></Field>
            <Field label={`Flat Amount override (${cur})`}><input type="number" min="0" className="input" value={f.amount} onChange={e => set('amount', e.target.value)} placeholder="Leave blank to use Qty × Rate" /></Field>
          </div>

          <h4 className="sect">Deductions & mode ({cur})</h4>
          <div className="grid-4">
            <Field label="TDS deduction"><input type="number" min="0" className="input" value={f.tds} onChange={e => set('tds', +e.target.value)} /></Field>
            <Field label="Advance deduction"><input type="number" min="0" className="input" value={f.advance} onChange={e => set('advance', +e.target.value)} /></Field>
            <Field label="Other deductions"><input type="number" min="0" className="input" value={f.other} onChange={e => set('other', +e.target.value)} /></Field>
            <Field label="Payment mode">
              <select className="input" value={f.paymentMode} onChange={e => set('paymentMode', e.target.value)}>
                <option value="cash">Cash</option><option value="bank">Bank transfer</option>
                <option value="upi">UPI</option><option value="cheque">Cheque</option>
              </select>
            </Field>
          </div>

          <div className="ws-panel net-line">
            <div><span className="stat-label">Net payable</span><strong className="mono">{money(net, cur)}</strong></div>
            <div className="row-actions">
              <Btn variant="ghost" onClick={() => save(false)} disabled={busy}>Save draft</Btn>
              <Btn variant="amber" onClick={() => save(true)} disabled={busy}>{busy ? 'Issuing…' : 'Approve & Issue'}</Btn>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view ? `Voucher — ${view.number}` : ''} wide>
        {view && company && (
          <>
            <VoucherDoc v={view} company={company} />
            <div className="row-end doc-actions">
              {view.status === 'draft' && <Btn onClick={() => { act(view, 'approve'); setView(null); }}>Approve</Btn>}
              {view.status === 'approved' && <Btn variant="amber" onClick={() => { act(view, 'paid'); setView(null); }}>Mark Paid</Btn>}
              <Btn variant="ghost" onClick={() => window.print()}>Print</Btn>
              <Btn onClick={() => dl(view)}><Icon name="down" size={15} /> Download PDF</Btn>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
