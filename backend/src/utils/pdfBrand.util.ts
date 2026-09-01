/**
 * Shared letterhead, page geometry and drawing primitives for every PDF this
 * app prints (the Lorry Receipt and the Tax Invoice today).
 *
 * Extracted when the invoice PDF was added: the alternative was a second copy
 * of the company address, the palette and ~150 lines of PDFKit primitives,
 * which is exactly how two documents drift into looking like they came from
 * different businesses.
 */
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

/**
 * The transporter's own letterhead. Hard-coded rather than read from the
 * Organization row because that model carries only a code and a name — the
 * postal address, contact details and GSTIN printed on a statutory document
 * have nowhere to live yet, and inventing a settings screen for four constants
 * would be its own feature.
 *
 * Kept byte-identical to the block in frontend/src/components/bookings/
 * LrDocument.vue. Change one, change the other — the on-screen LR and the
 * downloaded PDF are the same document.
 */
export const COMPANY = {
  name: 'MJ TRANSPORT',
  addressLines: ['6/123 K, Ishwarya Nagar, Pattanam Road,', 'Coimbatore - 641016, Tamil Nadu, India'],
  contact: 'Phone: +91 82209 26327   |   Email: mjtransport1246@gmail.com',
  gstin: 'GSTIN: 33HORPK1759G1ZJ',
};

export const INK = '#111827'; // body text
export const MUTED = '#5B6B7F'; // captions, labels and the footer note
export const LINE = '#C9CFD8'; // table and box rules
export const FILL = '#F2F4F7'; // table header bands

export const PAGE_MARGIN = 30;
export const PAGE_WIDTH = 595.28; // A4 portrait
export const PAGE_HEIGHT = 841.89;
export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
export const RIGHT_EDGE = PAGE_MARGIN + CONTENT_WIDTH;
export const PAGE_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN;

/**
 * PDFKit's built-in Helvetica is WinAnsi-encoded and has no glyph for the
 * rupee sign (U+20B9) — printing "₹" would emit a blank box. "Rs." is what a
 * physical LR pad prints anyway, so the PDF uses it rather than dragging in an
 * embedded font for one character. The HTML LR, rendered by a browser, keeps
 * the real symbol.
 */
export const RUPEE = 'Rs.';

/**
 * The build is a bare `tsc`, so `src/assets` is not copied into `dist/`.
 * Rather than depend on a build step, probe the places the logo can legitimately
 * be in dev and in a compiled deployment, and fall back to a text-only header if
 * it is absent — a missing brand asset should never fail a document download.
 */
export function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'src', 'assets', 'brand', 'mj-transport.png'),
    path.join(process.cwd(), 'assets', 'brand', 'mj-transport.png'),
    path.join(__dirname, '..', 'assets', 'brand', 'mj-transport.png'),
    path.join(__dirname, '..', '..', 'src', 'assets', 'brand', 'mj-transport.png'),
    path.join(__dirname, '..', '..', '..', 'src', 'assets', 'brand', 'mj-transport.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatDate(value: Date | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "18-Aug-2026 08:29 PM" — the dispatch stamp shown on the LR vehicle strip. */
export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  return `${formatDate(date)} ${time}`;
}

/** Prisma Decimals arrive as objects; null and undefined both mean "not set". */
export function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatAmount(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * An unknown field prints as a dash so a box reads as deliberately blank
 * rather than broken, and so the printed sheet has somewhere to write the
 * value in by hand.
 */
export function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  return text || '-';
}

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

export function strokeRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).lineWidth(0.7).strokeColor(LINE).stroke();
}

export function fillRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.rect(x, y, w, h).fillColor(color).fill();
}

export function hLine(doc: PDFKit.PDFDocument, x1: number, x2: number, y: number, width = 0.7, color = LINE) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke();
}

export function vLine(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number) {
  doc.moveTo(x, y1).lineTo(x, y2).lineWidth(0.7).strokeColor(LINE).stroke();
}

export type TextOptions = {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** Clips instead of wrapping past the given height — keeps a long value in its box. */
  height?: number;
};

export function text(doc: PDFKit.PDFDocument, value: string, x: number, y: number, w: number, opts: TextOptions = {}) {
  doc
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size ?? 8.5)
    .fillColor(opts.color ?? INK)
    .text(value, x, y, {
      width: w,
      align: opts.align ?? 'left',
      ...(opts.height ? { height: opts.height, ellipsis: true } : {}),
    });
}

/** Vertically centres a single line of text inside a row of the given height. */
export function cell(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: TextOptions = {}
) {
  const size = opts.size ?? 8.5;
  text(doc, value, x + 5, y + (h - size) / 2 - 1, w - 10, { ...opts, size, height: size + 2 });
}

export type Column = { width: number; title: string; align?: 'left' | 'center' | 'right' };

/**
 * Draws one row of a bordered table: an optional background band, the cell
 * text, and the vertical rules between columns. The row's outer box is left to
 * the caller so a multi-row table can be boxed once rather than per row.
 */
export function tableRow(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  values: string[],
  y: number,
  h: number,
  opts: { fill?: string; bold?: boolean; size?: number } = {}
) {
  if (opts.fill) fillRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, h, opts.fill);

  let x = PAGE_MARGIN;
  columns.forEach((column, index) => {
    if (index > 0) vLine(doc, x, y, y + h);
    cell(doc, values[index] ?? '', x, y, column.width, h, {
      bold: opts.bold,
      size: opts.size,
      align: column.align ?? 'left',
    });
    x += column.width;
  });
}

/**
 * The logo + name + address + GSTIN block every document opens with. Returns
 * the x the brand text started at so a caller can align anything beneath it.
 */
export function drawLetterhead(doc: PDFKit.PDFDocument, y: number, brandWidth = 250): number {
  const logoPath = resolveLogoPath();
  let brandX = PAGE_MARGIN;
  if (logoPath) {
    doc.image(logoPath, PAGE_MARGIN, y - 2, { fit: [86, 86] });
    brandX = PAGE_MARGIN + 96;
  }

  text(doc, COMPANY.name, brandX, y + 4, brandWidth, { size: 21, bold: true });
  let brandY = y + 32;
  for (const line of COMPANY.addressLines) {
    text(doc, line, brandX, brandY, brandWidth, { size: 8.5, color: MUTED });
    brandY += 12;
  }
  text(doc, COMPANY.contact, brandX, brandY, brandWidth + 30, { size: 8, color: MUTED });
  text(doc, COMPANY.gstin, brandX, brandY + 14, brandWidth, { size: 8.5, bold: true });

  return brandX;
}

export { PDFDocument };
