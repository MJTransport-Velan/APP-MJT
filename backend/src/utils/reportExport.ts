import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { ReportColumn } from '../reports/report.types';
import { formatCellValue, slugify } from './reportFormat.util';

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function exportToExcel(
  res: Response,
  reportLabel: string,
  columns: ReportColumn[],
  rows: Record<string, unknown>[]
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(reportLabel.substring(0, 31));

  sheet.columns = columns.map((col) => ({ header: col.label, key: col.key, width: 20 }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

  for (const row of rows) {
    const rowData: Record<string, string> = {};
    for (const col of columns) {
      rowData[col.key] = formatCellValue(row[col.key]);
    }
    sheet.addRow(rowData);
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${slugify(reportLabel)}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

export function exportToJson(res: Response, reportLabel: string, columns: ReportColumn[], rows: Record<string, unknown>[]) {
  const data = rows.map((row) => {
    const record: Record<string, unknown> = {};
    for (const col of columns) record[col.key] = row[col.key] instanceof Date ? (row[col.key] as Date).toISOString() : row[col.key];
    return record;
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${slugify(reportLabel)}.json"`);
  res.json({ report: reportLabel, generatedAt: new Date().toISOString(), columns: columns.map((c) => ({ key: c.key, label: c.label })), rows: data });
}

export function exportToCsv(res: Response, reportLabel: string, columns: ReportColumn[], rows: Record<string, unknown>[]) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvEscape(formatCellValue(row[c.key]))).join(','));
  const csv = [header, ...lines].join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${slugify(reportLabel)}.csv"`);
  res.send(csv);
}

export function exportToPdf(res: Response, reportLabel: string, columns: ReportColumn[], rows: Record<string, unknown>[]) {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${slugify(reportLabel)}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(reportLabel, { align: 'center' });
  doc.moveDown();

  const colWidth = (doc.page.width - 60) / Math.max(columns.length, 1);
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold');
  columns.forEach((col, i) => {
    doc.text(col.label, 30 + i * colWidth, y, { width: colWidth, ellipsis: true });
  });
  y += 18;
  doc.moveTo(30, y).lineTo(doc.page.width - 30, y).stroke();
  y += 4;

  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = 30;
    }
    columns.forEach((col, i) => {
      doc.text(formatCellValue(row[col.key]), 30 + i * colWidth, y, { width: colWidth, ellipsis: true });
    });
    y += 16;
  }

  doc.end();
}

/** Print-friendly HTML — the frontend opens this in a new tab and calls window.print(). */
export function buildPrintHtml(reportLabel: string, columns: ReportColumn[], rows: Record<string, unknown>[]): string {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(formatCellValue(row[c.key]))}</td>`).join('')}</tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(reportLabel)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
  h1 { font-size: 18px; color: #1e3a8a; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; text-align: left; }
  th { background: #1e3a8a; color: #fff; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${escapeHtml(reportLabel)}</h1>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}
