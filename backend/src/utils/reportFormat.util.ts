/**
 * Shared cell-formatting/filename helpers for both export sinks —
 * utils/reportExport.ts (streams to an HTTP Response) and
 * utils/reportExportFile.ts (writes to disk for scheduled/background
 * runs). Previously copy-pasted between the two; a formatting fix now
 * only needs to be made once.
 */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
