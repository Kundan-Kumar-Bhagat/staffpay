import Voucher from '../models/Voucher.js';
import Workspace from '../models/Workspace.js';
import { voucherPDF, pdfBuffer } from '../services/pdf.service.js';
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
  res.json(v);
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
  const to = req.body.to || v.payee.phone && v.payee.email ? v.payee.email : req.body.to;
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
