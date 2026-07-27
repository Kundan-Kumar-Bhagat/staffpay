import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { amountInWords, fmtMoney, invoiceTotals } from '../utils/helpers.js';

const PINE = '#0F3D33', INK = '#13231E', MUTED = '#5B6B64', LINE = '#C9D2CC',
  AMBER = '#E8A23C', SOFT = '#EEF3EF', GREEN = '#2E9E6B', RED = '#D64545',
  BLUE = '#3E7CB1', TEAL = '#1E8E8E';

const loadLogo = company => {
  const url = company.brand?.logoUrl;
  if (!url || !url.startsWith('/uploads/')) return null;
  try { return fs.readFileSync(path.join(process.cwd(), url.split('?')[0].slice(1))); } catch { return null; }
};
const brandAccent = company =>
  /^#[0-9a-fA-F]{6}$/.test(company.brand?.accent || '') ? company.brand.accent : PINE;

const kv = (doc, label, val, x, y, w) => {
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(6.8).text(label.toUpperCase(), x, y, { width: w, characterSpacing: 0.6 });
  doc.fillColor(INK).font('Helvetica').fontSize(9.6).text(String(val ?? '—'), x, y + 9, { width: w });
};

export function payslipPDF(p, company, user) {
  const o = company.payslip || {};
  const on = k => o[k] !== false;
  const cur = company.currency;
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  const W = 595.28, M = 42, CW = W - M * 2;

  // Header column bounds (prevents text clipping & wrapping issues with right alignment)
  const LW = 320;                    // Left letterhead width
  const RX = M + LW + 10;           // Right column start x
  const RW = W - M - RX;            // Right column width (~181.28 pt)

  /* ── adaptive letterhead ── */
  const headLines = [];
  if (on('tagline') && company.tagline) headLines.push(company.tagline);
  if (on('address')) headLines.push(`${company.address}, ${company.city}, ${company.state} ${company.zip}, ${company.country}`);
  if (on('contact')) headLines.push(`${company.phone}   ${company.email}${company.website ? '   ' + company.website : ''}`);
  if (on('taxIds')) headLines.push(`GSTIN: ${company.taxId || '—'}    PF Code: ${company.pfCode || '—'}`);
  const bandH = Math.max(96, 62 + headLines.length * 12 + 14);

  const accent = brandAccent(company);
  const logo = loadLogo(company);
  doc.rect(0, 0, W, bandH).fill(accent);
  doc.rect(0, bandH, W, 4).fill(AMBER);
  let nx = M;
  if (logo) { try { doc.image(logo, M, 20, { fit: [54, 54] }); nx = M + 66; } catch {} }
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(company.name, nx, 24, { width: 330 - (nx - M) });
  doc.font('Helvetica').fontSize(8.6).fillColor('#DDE8E2');
  headLines.forEach((l, i) => doc.text(l, nx, 48 + i * 12, { width: 330 - (nx - M) }));
  
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24).text('PAYSLIP', RX, 24, { width: RW, align: 'right' });
  doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(11).text(p.monthName, RX, 54, { width: RW, align: 'right' });
  doc.fillColor('#C7DAD1').font('Helvetica').fontSize(8.4);
  doc.text(`Slip No: ${p.serial}`, RX, 72, { width: RW, align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, RX, 84, { width: RW, align: 'right' });

  /* ── employee meta (statutory block is optional) ── */
  let y = bandH + 26;
  const colW = CW / 2 - 14, R = 30;
  const left = [['Employee Name', user.name], ['Designation', user.designation]];
  const right = [['Employee ID', user.employeeId], ['Department', user.department]];
  if (on('statutory')) {
    left.push(['PAN', user.pan], ['Bank Account', user.bank?.name ? `${user.bank.name} • ${user.bank.accountNo}` : '—'], ['Reporting Manager', company.managerName]);
    right.push(['PF / UAN No.', user.pfNo], ['Joined On', user.joinDate ? new Date(user.joinDate).toLocaleDateString('en-GB') : '—'], ['Work Location', `${company.city}, ${company.country}`]);
  }
  const rowsN = Math.max(left.length, right.length);
  for (let i = 0; i < rowsN; i++) {
    if (left[i]) kv(doc, left[i][0], left[i][1], M, y + i * R, colW);
    if (right[i]) kv(doc, right[i][0], right[i][1], M + colW + 28, y + i * R, colW);
  }
  y += rowsN * R + 8;
  doc.moveTo(M, y).lineTo(W - M, y).strokeColor(LINE).lineWidth(0.7).stroke();
  y += 12;

  /* ── earnings / deductions — full tables or compact strip ── */
  if (on('breakdown')) {
    const half = CW / 2 - 10, rowH = 20;
    const earnRows = [['Basic Salary', p.earnings.basic], ['House Rent Allowance', p.earnings.hra], ['Special Allowances', p.earnings.allowances], ['Overtime', p.earnings.overtime]];
    const dedRows = [['Provident Fund', p.deductions.pf], ['Income Tax (TDS)', p.deductions.tax], ['Absent Deduction', p.deductions.absent], ['Unpaid Leave', p.deductions.unpaidLeave], ['Advance / Others', p.deductions.advance]];
    const pad = (arr, n) => [...arr, ...Array(Math.max(0, n - arr.length)).fill(null)];
    const n = Math.max(earnRows.length, dedRows.length);
    const drawTable = (head, rws, x, totals) => {
      let ty = y;
      doc.rect(x, ty, half, rowH).fill(accent);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.4);
      doc.text(head, x + 10, ty + 6.5, { width: half - 74 });
      doc.text('AMOUNT', x + half - 64, ty + 6.5, { width: 54, align: 'right' });
      ty += rowH;
      rws.forEach((row, i) => {
        if (i % 2 === 0) doc.rect(x, ty, half, rowH).fill(SOFT);
        if (row) {
          doc.fillColor(INK).font('Helvetica').fontSize(9).text(row[0], x + 10, ty + 6.5, { width: half - 74 });
          doc.text(fmtMoney(row[1], cur), x + half - 64, ty + 6.5, { width: 54, align: 'right' });
        }
        ty += rowH;
      });
      doc.moveTo(x + 6, ty).lineTo(x + half - 6, ty).strokeColor(INK).lineWidth(1).stroke();
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.4);
      doc.text(totals[0], x + 10, ty + 6, { width: half - 74 });
      doc.text(fmtMoney(totals[1], cur), x + half - 64, ty + 6, { width: 54, align: 'right' });
      return ty + rowH + 6;
    };
    const yE = drawTable('EARNINGS', pad(earnRows, n), M, ['GROSS EARNINGS', p.gross]);
    const yD = drawTable('DEDUCTIONS', pad(dedRows, n), M + half + 20, ['TOTAL DEDUCTIONS', p.totalDeductions]);
    y = Math.max(yE, yD) + 8;
  } else {
    doc.rect(M, y, CW, 26).fill(SOFT);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5);
    doc.text('GROSS EARNINGS', M + 12, y + 8.5);
    doc.text(fmtMoney(p.gross, cur), M + CW / 2 - 70, y + 8.5, { width: 60, align: 'right' });
    doc.text('TOTAL DEDUCTIONS', M + CW / 2 + 12, y + 8.5);
    doc.text(fmtMoney(p.totalDeductions, cur), W - M - 12, y + 8.5, { align: 'right' });
    y += 38;
  }

  /* ── net pay band (words line optional) ── */
  doc.rect(M, y, CW, 46).fill(accent);
  doc.rect(M, y + 46, CW, 3).fill(AMBER);
  doc.fillColor('#C7DAD1').font('Helvetica-Bold').fontSize(7.2).text('NET PAY', M + 14, y + 9);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(19).text(fmtMoney(p.net, cur), M + 14, y + 19);
  if (on('words')) {
    const wordX = M + CW - 300;
    doc.fillColor('#C7DAD1').fontSize(7.2).text('AMOUNT IN WORDS', wordX, y + 9, { width: 286, align: 'right' });
    doc.fillColor('#FFFFFF').font('Helvetica').fontSize(8.8).text(amountInWords(p.net, cur), wordX, y + 19, { width: 286, align: 'right' });
  }
  y += 62;

  /* ── attendance strip (optional) ── */
  if (on('attendanceStrip')) {
    const chips = [['Present', p.days.present, GREEN], ['Late', p.days.late, AMBER], ['Half Day', p.days.half, TEAL], ['Leave', p.days.leave, BLUE], ['Absent', p.days.absent, RED]];
    let cx = M;
    chips.forEach(([label, val, color]) => {
      doc.rect(cx, y, 86, 34).fill(SOFT);
      doc.rect(cx, y, 3, 34).fill(color);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(String(val), cx + 12, y + 5);
      doc.fillColor(MUTED).font('Helvetica').fontSize(6.6).text(label.toUpperCase(), cx + 12, y + 21);
      cx += 95;
    });
    doc.fillColor(MUTED).fontSize(8).text(`Working days: ${p.days.working}    •    Hours logged: ${p.days.hours}`, M, y + 42);
    y += 62;
  }

  /* ── declaration + signature (each optional) ── */
  if (on('declaration')) {
    doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(7.6)
      .text('I hereby acknowledge receipt of this payslip and confirm that the particulars stated above are correct to the best of my knowledge.', M, y, { width: on('signature') ? CW - 170 : CW });
  }
  if (on('signature')) {
    const sigY = y + (on('declaration') ? 44 : 10);
    const sigW = 180;
    const sigX = W - M - sigW;
    doc.moveTo(sigX, sigY).lineTo(W - M, sigY).strokeColor(INK).lineWidth(0.8).stroke();
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text(company.managerName || 'Authorised Signatory', sigX, sigY + 5, { width: sigW, align: 'right' });
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.6).text(`${company.managerTitle || 'Manager'} — ${company.name}`, sigX, sigY + 16, { width: sigW, align: 'right' });
    y = sigY + 34;
  } else {
    y += on('declaration') ? 26 : 4;
  }

  /* ── footer (verification line optional) ── */
  const footText = on('verifyFooter')
    ? `This is a computer generated payslip issued by ${company.name} and does not require a physical signature. Verify authenticity online at ${company.website || 'our StaffPay portal'}/verify using slip no. ${p.serial}, or contact HR at ${company.email}.`
    : `This is a computer generated payslip issued by ${company.name} and does not require a physical signature.`;
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.rect(0, doc.page.height - 34, W, 34).fill(SOFT);
    doc.fillColor(MUTED).font('Helvetica').fontSize(6.8).text(footText, M, doc.page.height - 26, { width: CW - 90 });
    doc.text(`Page ${i + 1} of ${pages.count}`, W - M - 70, doc.page.height - 26, { width: 70, align: 'right' });
  }
  doc.end();
  return doc;
}

export function invoicePDF(inv, company) {
  const o = company.invoice || {};
  const on = k => o[k] !== false;
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  const W = 595.28, M = 42, CW = W - M * 2;
  const t = invoiceTotals(inv);
  const accent = brandAccent(company);
  const logo = loadLogo(company);

  const LW = 320;
  const RX = M + LW + 10;
  const RW = W - M - RX;

  doc.rect(0, 0, W, 96).fill(accent);
  doc.rect(0, 96, W, 4).fill(AMBER);
  let nx = M;
  if (logo) { try { doc.image(logo, M, 20, { fit: [54, 54] }); nx = M + 66; } catch {} }
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text(company.name, nx, 22, { width: 330 - (nx - M) });
  doc.fontSize(8.6).fillColor('#C7DAD1');
  doc.text(`${company.address}, ${company.city}, ${company.state} ${company.zip}${on('taxIds') ? ' • GSTIN: ' + (company.taxId || '—') : ''}`, nx, 44, { width: 330 - (nx - M) });
  doc.text(`${company.email} • ${company.phone}${company.website ? ' • ' + company.website : ''}`, nx, 56, { width: 330 - (nx - M) });
  
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('INVOICE', RX, 22, { width: RW, align: 'right' });
  doc.fillColor(AMBER).font('Helvetica-Bold').fontSize(10.5).text(inv.number, RX, 48, { width: RW, align: 'right' });
  doc.fillColor('#C7DAD1').font('Helvetica').fontSize(8.4).text(`Status: ${inv.status.toUpperCase()}`, RX, 64, { width: RW, align: 'right' });

  let y = 122;
  const colW = CW / 2 - 14;
  kv(doc, 'Billed To', `${inv.client.name}\n${inv.client.address || ''}${inv.client.taxId ? '\nGSTIN: ' + inv.client.taxId : ''}`, M, y, colW);
  kv(doc, 'Invoice Details', `Issued: ${inv.issueDate}\nDue: ${inv.dueDate}\nPrepared by: ${company.managerName}`, M + colW + 28, y, colW);
  y += 78;

  const cols = [M, M + 26, M + CW * 0.52, M + CW * 0.66, M + CW * 0.8];
  doc.rect(M, y, CW, 22).fill(accent);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.2);
  ['#', 'DESCRIPTION', 'QTY', 'RATE', 'AMOUNT'].forEach((h, i) =>
    doc.text(h, cols[i] + 6, y + 7, { width: (i === 4 ? CW * 0.2 : CW * 0.25), align: i === 4 ? 'right' : 'left' }));
  y += 22;
  (inv.items || []).forEach((it, i) => {
    if (i % 2 === 0) doc.rect(M, y, CW, 20).fill(SOFT);
    doc.fillColor(INK).font('Helvetica').fontSize(9);
    doc.text(String(i + 1), cols[0] + 6, y + 6.5, { width: 20 });
    doc.text(it.description, cols[1] + 6, y + 6.5, { width: CW * 0.44 });
    doc.text(String(it.qty), cols[2] + 6, y + 6.5, { width: CW * 0.12 });
    doc.text(fmtMoney(it.rate, company.currency), cols[3] + 6, y + 6.5, { width: CW * 0.13, align: 'right' });
    doc.text(fmtMoney(it.qty * it.rate, company.currency), cols[4] + 6, y + 6.5, { width: CW * 0.19, align: 'right' });
    y += 20;
  });
  y += 8;
  const line = (label, val, bold) => {
    doc.fillColor(INK).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10.5 : 9);
    doc.text(label, W - M - 220, y, { width: 130 });
    doc.text(fmtMoney(val, company.currency), W - M - 84, y, { width: 84, align: 'right' });
    y += bold ? 20 : 16;
  };
  line('Subtotal', t.subtotal);
  if (t.discount) line('Discount', -t.discount);
  line(`Tax (${inv.taxRate}%)`, t.tax);
  doc.moveTo(W - M - 220, y - 4).lineTo(W - M, y - 4).strokeColor(INK).lineWidth(1).stroke();
  doc.rect(W - M - 226, y, 226, 26).fill(accent);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10.5);
  doc.text('TOTAL', W - M - 216, y + 8);
  doc.text(fmtMoney(t.total, company.currency), W - M - 90, y + 8, { width: 80, align: 'right' });
  y += 38;

  if (on('words')) {
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7).text('AMOUNT IN WORDS', M, y);
    doc.fillColor(INK).font('Helvetica').fontSize(9).text(amountInWords(t.total, company.currency), M, y + 10, { width: CW });
    y += 30;
  }
  if (on('bank')) {
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7).text('PAYMENT DETAILS', M, y);
    doc.fillColor(INK).font('Helvetica').fontSize(8.6)
      .text(`${company.bank?.name || ''} • A/c ${company.bank?.accountNo || ''} • IFSC ${company.bank?.ifsc || ''} • In favour of ${company.name}`, M, y + 10, { width: CW });
    y += 26;
  }
  if (on('notes') && inv.notes) doc.fillColor(MUTED).fontSize(8).text(`Notes: ${inv.notes}`, M, y, { width: CW });

  doc.rect(0, doc.page.height - 30, W, 30).fill(SOFT);
  doc.fillColor(MUTED).font('Helvetica').fontSize(6.8)
    .text(`Thank you for your business. ${company.name} • ${company.city}, ${company.country} • Generated by StaffPay on ${new Date().toLocaleDateString('en-GB')}`, M, doc.page.height - 22, { width: CW - 90 });
  doc.text(`Page 1 of 1`, W - M - 70, doc.page.height - 22, { width: 70, align: 'right' });
  doc.end();
  return doc;
}

export const pdfBuffer = doc => new Promise((resolve, reject) => {
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);
});