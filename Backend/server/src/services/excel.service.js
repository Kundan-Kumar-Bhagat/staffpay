import ExcelJS from 'exceljs';

const PINE = 'FF0F3D33', AMBER = 'FFE8A23C';
const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PINE } };
const headFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

function styleHead(row) {
  row.height = 22;
  row.eachCell(c => {
    c.fill = headFill; c.font = headFont;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = { bottom: { style: 'thin', color: { argb: 'FFC9D2CC' } } };
  });
}

export async function attendanceXLSX(rows, month) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Attendance ${month}`);
  ws.columns = [{ width: 13 }, { width: 12 }, { width: 24 }, { width: 20 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 26 }];
  styleHead(ws.addRow(['Date', 'Emp ID', 'Name', 'Designation', 'In', 'Out', 'Status', 'Note']));
  rows.forEach(r => ws.addRow([r.date, r.user?.employeeId, r.user?.name, r.user?.designation, r.checkIn || '—', r.checkOut || '—', (r.status || '').toUpperCase(), r.note || '']));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function payslipXLSX(p, company, user) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Payslip', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 26 }, { width: 22 }, { width: 4 }, { width: 26 }, { width: 20 }];
  const t1 = ws.addRow([company.name.toUpperCase()]);
  t1.font = { bold: true, size: 16, color: { argb: PINE } };
  const t2 = ws.addRow([`${company.address}, ${company.city}, ${company.state} ${company.zip} • GSTIN: ${company.taxId || '—'} • PF Code: ${company.pfCode || '—'}`]);
  t2.font = { size: 9, color: { argb: 'FF5B6B64' } };
  const t3 = ws.addRow([`PAYSLIP — ${p.monthName}     Slip No: ${p.serial}`]);
  t3.font = { bold: true, size: 11 };
  ws.addRow([]);
  const kv = (l, v, l2, v2) => {
    const r = ws.addRow([l, v, '', l2, v2]);
    r.getCell(1).font = r.getCell(4).font = { bold: true, size: 9, color: { argb: 'FF5B6B64' } };
    r.getCell(2).font = r.getCell(5).font = { size: 10 };
  };
  kv('Employee', user.name, 'Employee ID', user.employeeId);
  kv('Designation', user.designation || '—', 'Department', user.department || '—');
  kv('PAN', user.pan || '—', 'PF / UAN', user.pfNo || '—');
  kv('Bank', user.bank?.name ? `${user.bank.name} • ${user.bank.accountNo}` : '—', 'Reporting Manager', company.managerName || '—');
  ws.addRow([]);
  const head = ws.addRow(['EARNINGS', '', '', 'DEDUCTIONS', '']);
  ws.mergeCells(head.number, 1, head.number, 2);
  ws.mergeCells(head.number, 4, head.number, 5);
  styleHead(head);
  const earn = [['Basic Salary', p.earnings.basic], ['House Rent Allowance', p.earnings.hra], ['Special Allowances', p.earnings.allowances], ['Overtime', p.earnings.overtime], ['GROSS EARNINGS', p.gross]];
  const ded = [['Provident Fund', p.deductions.pf], ['Income Tax (TDS)', p.deductions.tax], ['Absent Deduction', p.deductions.absent], ['Unpaid Leave', p.deductions.unpaidLeave], ['TOTAL DEDUCTIONS', p.totalDeductions]];
  earn.forEach(([l, v], i) => {
    const r = ws.addRow([l, v, '', ded[i][0], ded[i][1]]);
    if (i === earn.length - 1) r.eachCell(c => c.font = { bold: true });
  });
  ws.addRow([]);
  const net = ws.addRow(['NET PAY', p.net, '', 'AMOUNT IN WORDS', '']);
  net.getCell(1).fill = net.getCell(2).fill = headFill;
  net.getCell(1).font = net.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  const days = ws.addRow([`Days — Working: ${p.days.working}  Present: ${p.days.present}  Late: ${p.days.late}  Half: ${p.days.half}  Leave: ${p.days.leave}  Absent: ${p.days.absent}  Hours: ${p.days.hours}`]);
  days.font = { size: 9, color: { argb: 'FF5B6B64' } };
  const f = ws.addRow([`Computer generated payslip issued by ${company.name}. Verify with HR at ${company.email}.`]);
  f.font = { italic: true, size: 8, color: { argb: 'FF5B6B64' } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function invoiceXLSX(inv, company, totals) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Invoice', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 8 }, { width: 42 }, { width: 10 }, { width: 16 }, { width: 18 }];
  const t1 = ws.addRow([`${company.name.toUpperCase()} — INVOICE ${inv.number}`]);
  t1.font = { bold: true, size: 14, color: { argb: PINE } };
  ws.addRow([`Billed to: ${inv.client.name} • ${inv.client.address || ''} • Issued ${inv.issueDate} • Due ${inv.dueDate} • Status ${inv.status.toUpperCase()}`])
    .font = { size: 9, color: { argb: 'FF5B6B64' } };
  ws.addRow([]);
  styleHead(ws.addRow(['#', 'Description', 'Qty', 'Rate', 'Amount']));
  (inv.items || []).forEach((it, i) => ws.addRow([i + 1, it.description, it.qty, it.rate, it.qty * it.rate]));
  ws.addRow([]);
  ws.addRow(['', '', '', 'Subtotal', totals.subtotal]);
  if (totals.discount) ws.addRow(['', '', '', 'Discount', -totals.discount]);
  ws.addRow(['', '', '', `Tax (${inv.taxRate}%)`, totals.tax]);
  const tot = ws.addRow(['', '', '', 'TOTAL', totals.total]);
  tot.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER } }; c.font = { bold: true }; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}