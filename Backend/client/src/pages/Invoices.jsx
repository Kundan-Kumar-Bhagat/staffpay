import { useEffect, useState } from 'react';
import api from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { PageHead, Btn, Field, Modal, useToast, Icon, Reveal, Empty, ShareMenu } from '../components/ui';
import { dstr, downloadUrl, money } from '../utils/format';

const blankClient = { name: '', email: '', phone: '', address: '', taxId: '' };
const blankInv = () => ({ client: { ...blankClient }, items: [{ description: '', qty: 1, rate: 0 }], taxRate: 18, discount: 0, dueDate: '', notes: '', status: 'draft' });

const invTotals = inv => {
  const subtotal = inv.items.reduce((s, i) => s + (+i.qty || 0) * (+i.rate || 0), 0);
  const taxable = subtotal - (+inv.discount || 0);
  const tax = taxable * (+inv.taxRate || 0) / 100;
  return { subtotal, tax, total: taxable + tax };
};
const STATUS_COLORS = { draft: 'st-half', sent: 'st-leave', paid: 'st-present', overdue: 'st-absent' };

export default function Invoices() {
  const { company } = useCompany();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blankInv());
  const [busy, setBusy] = useState(false);
  const cur = company?.currency || 'INR';

  const load = () => api.get('/invoices').then(r => setList(r.data));
  useEffect(() => { load(); }, []);

  const setItem = (i, k, v) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }));
  const save = async e => {
    e.preventDefault();
    if (!form.client.name || !form.items.some(i => i.description)) return toast('Client name and at least one line item are required', 'err');
    setBusy(true);
    try { await api.post('/invoices', { ...form, issueDate: dstr() }); toast('Invoice created'); setModal(false); setForm(blankInv()); load(); }
    catch (e) { toast(e.response?.data?.message || 'Create failed', 'err'); }
    setBusy(false);
  };
  const setStatus = async (inv, status) => {
    await api.put(`/invoices/${inv._id}`, { status });
    toast(`Marked ${status}`); load();
  };
  const dl = async (inv, ext) => {
    try { await downloadUrl(`/invoices/${inv._id}/${ext}`, `${inv.number}.${ext}`); toast(`${ext.toUpperCase()} downloaded`); }
    catch { toast('Download failed', 'err'); }
  };
  const emailInv = async inv => {
    try { const { data } = await api.post(`/invoices/${inv._id}/email`); toast(data.message); }
    catch (e) { toast(e.response?.data?.message || 'Email failed', 'err'); }
  };
  const t = invTotals(form);

  return (
    <>
      <PageHead title="Invoices" sub="Bill clients, track payment, export and share.">
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={15} /> New invoice</Btn>
      </PageHead>

      <Reveal>
        <div className="card">
          {list === null ? null : !list.length ? <Empty icon="invoice" title="No invoices" sub="Create your first invoice to bill a client." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Number</th><th>Client</th><th>Issued</th><th>Due</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {list.map(inv => (
                    <tr key={inv._id}>
                      <td className="mono">{inv.number}</td>
                      <td><b>{inv.client.name}</b></td>
                      <td className="mono">{inv.issueDate}</td>
                      <td className="mono">{inv.dueDate || '—'}</td>
                      <td className="mono"><b>{money(invTotals(inv).total, cur)}</b></td>
                      <td>
                        <select className={`input input-sm pill-select ${STATUS_COLORS[inv.status]}`} value={inv.status} onChange={e => setStatus(inv, e.target.value)}>
                          {['draft', 'sent', 'paid', 'overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Btn variant="ghost" className="btn-sm" onClick={() => dl(inv, 'pdf')}><Icon name="down" size={13} /> PDF</Btn>
                          <Btn variant="ghost" className="btn-sm" onClick={() => dl(inv, 'xlsx')}>Excel</Btn>
                          <Btn variant="ghost" className="btn-sm" onClick={() => emailInv(inv)}>Email</Btn>
                          <ShareMenu url={`/invoices/${inv._id}/pdf`} filename={`${inv.number}.pdf`} title={`Invoice ${inv.number}`}
                            text={`Invoice ${inv.number} — ${inv.client.name}. Total ${money(invTotals(inv).total, cur)}. Due ${inv.dueDate || 'on receipt'}.`} />
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

      <Modal open={modal} onClose={() => setModal(false)} title="New invoice" wide>
        <form onSubmit={save} className="stack">
          <h4 className="sect">Bill to</h4>
          <div className="grid-3">
            <Field label="Client name *"><input className="input" value={form.client.name} onChange={e => setForm(f => ({ ...f, client: { ...f.client, name: e.target.value } }))} /></Field>
            <Field label="Email"><input className="input" value={form.client.email} onChange={e => setForm(f => ({ ...f, client: { ...f.client, email: e.target.value } }))} /></Field>
            <Field label="GSTIN / Tax ID"><input className="input" value={form.client.taxId} onChange={e => setForm(f => ({ ...f, client: { ...f.client, taxId: e.target.value } }))} /></Field>
            <Field label="Address"><input className="input" value={form.client.address} onChange={e => setForm(f => ({ ...f, client: { ...f.client, address: e.target.value } }))} /></Field>
            <Field label="Due date"><input className="input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></Field>
          </div>
          <h4 className="sect">Line items</h4>
          {form.items.map((it, i) => (
            <div className="item-row" key={i}>
              <input className="input" placeholder="Description" value={it.description} onChange={e => setItem(i, 'description', e.target.value)} />
              <input className="input qty" type="number" min="0" value={it.qty} onChange={e => setItem(i, 'qty', e.target.value)} />
              <input className="input qty" type="number" min="0" value={it.rate} onChange={e => setItem(i, 'rate', e.target.value)} />
              <span className="mono item-amt">{money(it.qty * it.rate, cur)}</span>
              <button type="button" className="icon-btn" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, x) => x !== i) }))}><Icon name="x" size={15} /></button>
            </div>
          ))}
          <Btn type="button" variant="ghost" className="btn-sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { description: '', qty: 1, rate: 0 }] }))}>
            <Icon name="plus" size={14} /> Add item
          </Btn>
          <div className="grid-3">
            <Field label="Tax rate %"><input className="input" type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} /></Field>
            <Field label="Discount"><input className="input" type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} /></Field>
            <Field label="Notes"><input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field>
          </div>
          <div className="totals-line mono">
            Subtotal {money(t.subtotal, cur)} &nbsp;•&nbsp; Tax {money(t.tax, cur)} &nbsp;•&nbsp; <b>Total {money(t.total, cur)}</b>
          </div>
          <div className="row-end"><Btn type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create invoice'}</Btn></div>
        </form>
      </Modal>
    </>
  );
}