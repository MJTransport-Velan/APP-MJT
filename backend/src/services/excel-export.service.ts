import ExcelJS from 'exceljs';
import { ExportExcelInput } from '../validators/excel-export.validator';

export const excelExportService = {
  /** Builds a real .xlsx from whatever columns/rows a list page already has in hand — no per-entity knowledge needed here. */
  async build(input: ExportExcelInput): Promise<{ buffer: Buffer; fileName: string }> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(input.sheetName || 'Sheet1');

    sheet.columns = input.columns.map((c) => ({ header: c.header, key: c.key, width: Math.max(c.header.length + 4, 14) }));
    sheet.getRow(1).font = { bold: true };

    for (const row of input.rows) {
      const flatRow: Record<string, string | number | boolean> = {};
      for (const col of input.columns) {
        const value = row[col.key];
        flatRow[col.key] = value === null || value === undefined ? '' : (value as string | number | boolean);
      }
      sheet.addRow(flatRow);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = input.filename.toLowerCase().endsWith('.xlsx') ? input.filename : `${input.filename}.xlsx`;
    return { buffer: Buffer.from(buffer), fileName };
  },
};
