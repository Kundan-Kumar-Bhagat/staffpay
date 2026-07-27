import Voucher from '../models/Voucher.js';
import Workspace from '../models/Workspace.js';
import { waEnabled, sendWhatsAppDocument } from '../services/whatsapp.service.js';
import { voucherPDF, pdfBuffer, disbursementPDF } from '../services/pdf.service.js';
import { sendMail } from '../services/mail.service.js';
import { logActivity } from '../utils/log.js';
import { fmtMoney } from '../utils/helpers.js';

const amt = v => Math.max(0, Math.round(+v || 0));

export const create = async (req, res) => {
  const { payee, description, from, to, qty, rate, amount, deductions = {}, paymentMode, paymentRef, note, issue } = req.body;
  if (!payee?.name) return res.status(400).json({ message: 'Payee name is required' });
  if (!description) return res.status(400).json({ message: 'A description of the work is required' });
  const gross = amount != null && amount !== '' ? amt(amount) : amt(qty) * amt(rate);
  const ded = { tds: amt(deductions.tds), advance: amt(deductions.advance), other: amt(deductions.other) };
  const net = gross - (ded.tds + ded.advance + ded.other);
  const year = new Date().getFullYear();
  const number = `PV-${year}-${String((await Voucher.countDocuments()) + 1).padStart(3, '0')}`;
  const v = await Voucher.create({
    number, payee, description, from, to, qty: amt(qty) || 1, rate: amt(rate), amount: gross,
    deductions: ded, net, paymentMode: paymentMode || 'cash', paymentRef, note,
    status: issue ? 'approved' : 'draft', createdBy: req.user._id,
    ...(issue ? { approvedBy: req.user._id, approvedAt: new Date() } : {}),
  });
  logActivity(req.user, 'invoice', `created payment voucher ${number} for ${payee.name} (${fmtMoney(net, req.company.currency)})`);
  res.status(201).json(v);
};

export const list = async (req, res) =>
  res.json(await Voucher.find().populate('createdBy approvedBy', 'name').sort('-createdAt'));

export const approve = async (req, res) => {
  const v = await Voucher.findById(req.params.id);
  if (!v) return res.status(404).json({ message: 'Voucher not found' });
  if (v.status !== 'draft') return res.status(400).json({ message: 'Only draft vouchers can be approved' });
  v.status = 'approved'; v.approvedBy = req.user._id; v.approvedAt = new Date();
  await v.save();
  logActivity(req.user, 'invoice', `approved voucher ${v.number}`);
  res.json(v);
};

export const markPaid = async (req, res) => {
  const v = await Voucher.findById(req.params.id);
  if (!v) return res.status(404).json({ message: 'Voucher not found' });
  if (v.status === 'draft') return res.status(400).json({ message: 'Approve the voucher before marking it paid' });
  v.status = 'paid'; v.paidAt = new Date();
  if (req.body.paymentRef) v.paymentRef = req.body.paymentRef;
  if (req.body.paymentMode) v.paymentMode = req.body.paymentMode;
  await v.save();
  logActivity(req.user, 'invoice', `marked voucher ${v.number} as paid (${v.paymentMode})`);

  if (v.payee.phone && waEnabled()) {
    pdfBuffer(voucherPDF(v, req.company))
      .then(buf => sendWhatsAppDocument(v.payee.phone, buf, `${v.number}.pdf`,
        `Payment received — voucher ${v.number} from ${req.company.name}, ${fmtMoney(v.net, req.company.currency)}. Thank you for your work.`))
      .then(ok => ok && logActivity(req.user, 'invoice', `WhatsApped voucher ${v.number} to ${v.payee.phone}`))
      .catch(() => {});
  }
  res.json(v);
};

export const deliver = async (req, res) => {
  const v = await Voucher.findById(req.params.id);
  if (!v) return res.status(404).json({ message: 'Voucher not found' });
  const company = req.company;
  const { channel = 'whatsapp', to } = req.body;

  if (channel === 'email') {
    const addr = to || v.payee.email;
    if (!addr) return res.status(400).json({ message: 'No email — pass { "to": "…" } (this payee has no email on record)' });
    const buf = await pdfBuffer(voucherPDF(v, company));
    const sent = await sendMail({
      to: addr, subject: `Payment voucher ${v.number} — ${company.name}`,
      text: `Dear ${v.payee.name},\n\nAttached: payment voucher ${v.number} for ${fmtMoney(v.net, company.currency)}.\n\n${company.name}`,
      attachments: [{ filename: `${v.number}.pdf`, content: buf }],
    });
    return res.json({ ok: sent, message: sent ? `Emailed to ${addr}` : 'SMTP not configured' });
  }

  if (!v.payee.phone) return res.status(400).json({ message: 'This payee has no phone number on record' });
  const buf = await pdfBuffer(voucherPDF(v, company));
  const ok = await sendWhatsAppDocument(v.payee.phone, buf, `${v.number}.pdf`,
    `Payment voucher ${v.number} — ${company.name}. Amount ${fmtMoney(v.net, company.currency)} (${v.status}).`);
  if (ok) logActivity(req.user, 'invoice', `sent voucher ${v.number} to ${v.payee.phone} on WhatsApp`);
  res.json({ ok, message: ok ? `Sent to ${v.payee.phone} on WhatsApp` : 'WhatsApp not configured or send failed — add WA_* keys' });
};

const rangeFilter = q => {
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from + 'T00:00:00');
    if (q.to) filter.createdAt.$lte = new Date(q.to + 'T23:59:59');
  }
  return filter;
};

export const disbursement = async (req, res) => {
  const vouchers = await Voucher.find(rangeFilter(req.query)).sort('createdAt');
  const byMode = {};
  vouchers.forEach(v => byMode[v.paymentMode] = (byMode[v.paymentMode] || 0) + v.net);
  res.json({ vouchers, count: vouchers.length, total: vouchers.reduce((s, v) => s + v.net, 0), byMode });
};

export const disbursementPdf = async (req, res) => {
  const vouchers = await Voucher.find(rangeFilter(req.query)).sort('createdAt');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="disbursement-${req.query.from || 'all'}${req.query.to ? '-' + req.query.to : ''}.pdf"`);
  disbursementPDF(vouchers, req.company, { from: req.query.from, to: req.query.to }).pipe(res);
};

export const remove = async (req, res) => { await Voucher.findByIdAndDelete(req.params.id); res.json({ message: 'Voucher deleted' }); };

export const pdf = async (req, res) => {
  const v = await Voucher.findById(req.params.id);
  if (!v) return res.status(404).json({ message: 'Voucher not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${v.number}.pdf"`);
  voucherPDF(v, req.company).pipe(res);
};

export const emailVoucher = async (req, res) => {
  const v = await Voucher.findById(req.params.id);
  if (!v) return res.status(404).json({ message: 'Voucher not found' });
  const to = req.body.to || (v.payee.phone && v.payee.email ? v.payee.email : req.body.to);
  if (!to) return res.status(400).json({ message: 'Pass { "to": "email" } — the payee has no email on record' });
  const buf = await pdfBuffer(voucherPDF(v, req.company));
  const sent = await sendMail({
    to, subject: `Payment voucher ${v.number} — ${req.company.name}`,
    text: `Dear ${v.payee.name},\n\nPlease find attached payment voucher ${v.number} for ${fmtMoney(v.net, req.company.currency)}.\n\n${req.company.name}`,
    attachments: [{ filename: `${v.number}.pdf`, content: buf }],
  });
  res.json({ message: sent ? `Emailed to ${to}` : 'SMTP not configured' });
};

export const verify = async (req, res) => {
  const number = (req.params.number || '').trim();
  const safe = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const v = await Voucher.findOne({ number: { $regex: `^${safe}$`, $options: 'i' } });
  if (!v) return res.status(404).json({ valid: false, message: 'No payment voucher found with this number.' });
  const ws = await Workspace.findById(v.workspace);
  const n = v.payee.name || '';
  res.json({
    valid: true, kind: 'voucher', number: v.number,
    payee: `${n[0]}${'*'.repeat(Math.min(6, Math.max(3, n.length - 1)))}`,
    description: v.description, amount: String(v.amount), net: String(v.net),
    status: v.status, paymentMode: v.paymentMode,
    company: ws?.name || '—', brand: { logoUrl: ws?.settings.brand?.logoUrl, accent: ws?.settings.brand?.accent },
    issuedAt: v.createdAt,
  });
};
