import Invoice from '../models/Invoice.js';
import Company from '../models/Company.js';
import { invoiceTotals, currentMonth, fmtMoney } from '../utils/helpers.js';
import { invoicePDF, pdfBuffer } from '../services/pdf.service.js';
import { invoiceXLSX } from '../services/excel.service.js';
import { sendMail } from '../services/mail.service.js';
import { logActivity } from '../utils/log.js';

export const emailInvoice = async (req, res) => {
  const inv = await load(req, res); if (!inv) return;
  const company = await Company.findOne();
  const to = req.body.to || inv.client.email;
  if (!to) return res.status(400).json({ message: 'No recipient — add a client email or pass { "to": "…" }' });
  const t = invoiceTotals(inv);
  const pdf = await pdfBuffer(invoicePDF(inv, company));
  const sent = await sendMail({
    to,
    subject: `Invoice ${inv.number} — ${company.name}`,
    text: `Dear ${inv.client.name},\n\nPlease find attached invoice ${inv.number} for ${fmtMoney(t.total, company.currency)}.\nDue date: ${inv.dueDate || 'on receipt'}.\n\nThank you for your business.\n${company.name}`,
    attachments: [{ filename: `${inv.number}.pdf`, content: pdf }],
  });
  res.json({ message: sent ? `Invoice emailed to ${to}` : 'SMTP not configured — add SMTP_* keys in server/.env' });
};
export const create = async (req, res) => {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments();
  const inv = await Invoice.create({
    ...req.body,
    number: `INV-${year}-${String(count + 1).padStart(3, '0')}`,
    issueDate: req.body.issueDate || new Date().toISOString().slice(0, 10),
    createdBy: req.user._id,
  });
  logActivity(req.user, 'invoice', `created invoice ${inv.number} for ${inv.client.name}`);
  res.status(201).json(inv);
};

export const list = async (req, res) => res.json(await Invoice.find().sort('-createdAt'));

export const update = async (req, res) => {
  const inv = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!inv) return res.status(404).json({ message: 'Invoice not found' });
  res.json(inv);
};

export const remove = async (req, res) => {
  await Invoice.findByIdAndDelete(req.params.id);
  res.json({ message: 'Invoice deleted' });
};

const load = async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) { res.status(404).json({ message: 'Invoice not found' }); return null; }
  return inv;
};

export const pdf = async (req, res) => {
  const inv = await load(req, res); if (!inv) return;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${inv.number}.pdf"`);
  invoicePDF(inv, await Company.findOne()).pipe(res);
};

export const xlsx = async (req, res) => {
  const inv = await load(req, res); if (!inv) return;
  const buf = await invoiceXLSX(inv, await Company.findOne(), invoiceTotals(inv));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${inv.number}.xlsx"`);
  res.send(buf);
};