import api from '@/services/api';

export interface ExportColumn {
  header: string;
  key: string;
}

/** Turns already-in-hand list data (headers + rows this page is already showing) into a real .xlsx download via the generic backend export endpoint — no per-entity backend work needed. */
export async function exportRowsToExcel(filename: string, columns: ExportColumn[], rows: Record<string, unknown>[]) {
  const response = await api.post(
    '/system/export-excel',
    { filename, columns, rows },
    { responseType: 'blob' }
  );
  const url = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

const DISPLAY_KEYS = ['name', 'title', 'tripNumber', 'invoiceNumber', 'advanceNumber', 'receiptNumber', 'paymentNumber', 'registrationNumber', 'fullName', 'code', 'label'];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** Best-effort flattening of a table row into plain exportable values when a page hasn't supplied its own row mapper — handles the common cases (nested {id,name}-shaped relations, ISO date strings) reasonably, without needing to know anything about the specific entity. */
export function flattenValueForExport(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return ISO_DATE_RE.test(value) ? new Date(value).toLocaleDateString() : value;
  if (typeof value === 'object') {
    for (const key of DISPLAY_KEYS) {
      const v = (value as Record<string, unknown>)[key];
      if (typeof v === 'string' || typeof v === 'number') return v;
    }
    return JSON.stringify(value);
  }
  return String(value);
}
