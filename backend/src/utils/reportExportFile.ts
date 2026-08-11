import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ReportColumn } from '../reports/report.types';
import { formatCellValue, slugify } from './reportFormat.util';

export const REPORT_EXPORTS_DIR = path.join(process.cwd(), 'report-exports');

function ensureDir() {
  if (!fs.existsSync(REPORT_EXPORTS_DIR)) fs.mkdirSync(REPORT_EXPORTS_DIR, { recursive: true });
}

/**
 * File-writing counterparts to utils/reportExport.ts's Response-based
 * functions — a scheduled/background run has no HTTP response to stream
 * into, so the same three formats are written straight to
 * REPORT_EXPORTS_DIR instead. Column/row shape is identical, so a
 * schedule and an on-demand download of the same report produce
 * byte-equivalent content.
 */
export async function writeReportFile(format: 'PDF' | 'EXCEL' | 'CSV', reportLabel: string, columns: ReportColumn[], rows: Record<string, unknown>[]): Promise<string> {
  ensureDir();
  const fileName = `${slugify(reportLabel)}-${Date.now()}`;

  if (format === 'EXCEL') {
    const filePath = path.join(REPORT_EXPORTS_DIR, `${fileName}.xlsx`);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(reportLabel.substring(0, 31));
    sheet.columns = columns.map((col) => ({ header: col.label, key: col.key, width: 20 }));
    for (const row of rows) {
      const rowData: Record<string, string> = {};
      for (const col of columns) rowData[col.key] = formatCellValue(row[col.key]);
      sheet.addRow(rowData);
    }
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  if (format === 'CSV') {
    const filePath = path.join(REPORT_EXPORTS_DIR, `${fileName}.csv`);
    const header = columns.map((c) => c.label).join(',');
    const lines = rows.map((row) => columns.map((c) => formatCellValue(row[c.key])).join(','));
    fs.writeFileSync(filePath, [header, ...lines].join('\r\n'));
    return filePath;
  }

  // PDF
  const filePath = path.join(REPORT_EXPORTS_DIR, `${fileName}.pdf`);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(16).text(reportLabel, { align: 'center' });
    doc.moveDown();

    const colWidth = (doc.page.width - 60) / Math.max(columns.length, 1);
    let y = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    columns.forEach((col, i) => doc.text(col.label, 30 + i * colWidth, y, { width: colWidth, ellipsis: true }));
    y += 18;
    doc.moveTo(30, y).lineTo(doc.page.width - 30, y).stroke();
    y += 4;

    doc.font('Helvetica').fontSize(8);
    for (const row of rows) {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 30;
      }
      columns.forEach((col, i) => doc.text(formatCellValue(row[col.key]), 30 + i * colWidth, y, { width: colWidth, ellipsis: true }));
      y += 16;
    }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
