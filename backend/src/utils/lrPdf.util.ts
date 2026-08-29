import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { BookingWithRelations } from '../repositories/booking.repository';

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
const COMPANY = {
  name: 'MJ TRANSPORT',
  addressLines: ['6/123 K, Ishwarya Nagar, Pattanam Road,', 'Coimbatore - 641016, Tamil Nadu, India'],
  contact: 'Phone: +91 82209 26327   |   Email: mjtransport1246@gmail.com',
  gstin: 'GSTIN: 33HORPK1759G1ZJ',
};

const INK = '#111827'; // body text
const MUTED = '#5B6B7F'; // captions, labels and the footer note
const LINE = '#C9CFD8'; // table and box rules
const FILL = '#F2F4F7'; // table header bands

const PAGE_MARGIN = 30;
const PAGE_WIDTH = 595.28; // A4 portrait
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const RIGHT_EDGE = PAGE_MARGIN + CONTENT_WIDTH;
const PAGE_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN;

/**
 * PDFKit's built-in Helvetica is WinAnsi-encoded and has no glyph for the
 * rupee sign (U+20B9) — printing "₹" would emit a blank box. "Rs." is what a
 * physical LR pad prints anyway, so the PDF uses it rather than dragging in an
 * embedded font for one character. The HTML LR, rendered by a browser, keeps
 * the real symbol.
 */
const RUPEE = 'Rs.';

// ---------------------------------------------------------------------------
// Single-page budget
//
// An LR is one sheet of paper. Everything below is sized so the document can
// never spill onto a second page: the fixed bands are constants, the three
// elastic blocks (the party boxes, the goods table and the remarks strip) are
// clamped to a budget computed before anything is drawn, and the signature
// block is pinned to the foot of the page so a short consignment fills the
// sheet the same way a full one does.
// ---------------------------------------------------------------------------

const HEADER_H = 88;
const HEADER_GAP = 12;
const VEHICLE_HEADER_H = 22;
const VEHICLE_VALUE_H = 24;
const VEHICLE_H = VEHICLE_HEADER_H + VEHICLE_VALUE_H;
const MONEY_H = 132;
/**
 * Blank band running from the remarks box to the bottom margin. It carried
 * the three signature columns and then the closing note, both since dropped;
 * the space is deliberately kept rather than reclaimed, so the printed sheet
 * still has room for a signature, a stamp or a handwritten note, and so a
 * short LR fills the page the same way a crowded one does.
 */
const BLANK_H = 116;
const GAP = 12;

const PARTY_MIN_H = 100;
const PARTY_MAX_H = 132;
const REMARKS_MIN_H = 40;
const REMARKS_MAX_H = 60;
const REMARKS_GAP = 16;

const GOODS_TITLE_H = 22;
const GOODS_HEADER_H = 24;
const GOODS_TOTAL_H = 24;
const GOODS_ROW_MAX_H = 22;
const GOODS_ROW_MIN_H = 12;
const GOODS_CHROME_H = GOODS_TITLE_H + GOODS_HEADER_H + GOODS_TOTAL_H;

/** Where the blank band starts — pinned so it always runs to the bottom margin. */
const BLANK_TOP = PAGE_BOTTOM - BLANK_H;

/**
 * Vertical space the three elastic blocks have to share, once every fixed band
 * and gap above the blank band is accounted for.
 */
const ELASTIC_BUDGET =
  BLANK_TOP -
  6 -
  (PAGE_MARGIN + HEADER_H + HEADER_GAP + VEHICLE_H + GAP + GAP + GAP + MONEY_H + GAP + REMARKS_GAP);

/**
 * The build is a bare `tsc`, so `src/assets` is not copied into `dist/`.
 * Rather than depend on a build step, probe the places the logo can legitimately
 * be in dev and in a compiled deployment, and fall back to a text-only header if
 * it is absent — a missing brand asset should never fail an LR download.
 */
function resolveLogoPath(): string | null {
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

function formatDate(value: Date | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "18-Aug-2026 08:29 PM" — the dispatch stamp shown on the vehicle strip. */
function formatDateTime(value: Date | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  return `${formatDate(date)} ${time}`;
}

/** Prisma Decimals arrive as objects; null and undefined both mean "not set". */
function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const TRANSPORT_MODE_LABELS: Record<string, string> = { ROAD: 'ROAD', RAIL: 'RAIL', AIR: 'AIR', SEA: 'SEA' };
const FREIGHT_PAYMENT_LABELS: Record<string, string> = {
  TO_PAY: 'To Pay',
  PAID: 'Paid',
  TO_BE_BILLED: 'To Be Billed',
};
const PARTY_LABELS: Record<string, string> = {
  CONSIGNOR: 'Consignor',
  CONSIGNEE: 'Consignee',
  THIRD_PARTY: 'Third Party',
};

function label(map: Record<string, string>, value: string | null | undefined): string {
  return value ? map[value] ?? value : '-';
}

/**
 * Every booking detail is optional now — a consignment is routinely booked
 * before its weight, address or parcel type is known. An unknown field prints
 * as a dash so the box reads as deliberately blank rather than broken, and so
 * the printed sheet has somewhere to write the value in by hand.
 */
function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  return text || '-';
}

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

function strokeRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).lineWidth(0.7).strokeColor(LINE).stroke();
}

function fillRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.rect(x, y, w, h).fillColor(color).fill();
}

function hLine(doc: PDFKit.PDFDocument, x1: number, x2: number, y: number, width = 0.7, color = LINE) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke();
}

function vLine(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number) {
  doc.moveTo(x, y1).lineTo(x, y2).lineWidth(0.7).strokeColor(LINE).stroke();
}

type TextOptions = {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** Clips instead of wrapping past the given height — keeps a long value in its box. */
  height?: number;
};

function text(doc: PDFKit.PDFDocument, value: string, x: number, y: number, w: number, opts: TextOptions = {}) {
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
function cell(
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

type Column = { width: number; title: string; align?: 'left' | 'center' | 'right' };

/**
 * Draws one row of a bordered table: an optional background band, the cell
 * text, and the vertical rules between columns. The row's outer box is left to
 * the caller so a multi-row table can be boxed once rather than per row.
 */
function tableRow(
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

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/**
 * Renders the Lorry Receipt as a single A4 page and resolves the complete
 * buffer. Buffering rather than piping straight to the response means a failure
 * mid-render still surfaces as a clean JSON error instead of a truncated file.
 */
export function buildLrPdf(booking: BookingWithRelations): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Everything is positioned absolutely, so PDFKit's own pagination would
    // only ever fire by accident. Disarm it: the layout below is what
    // guarantees a single page, not the flow engine.
    doc.page.margins.bottom = 0;

    // ----- Content prepared before layout --------------------------------
    const partyWidth = (CONTENT_WIDTH - 10) / 2;
    const partyTextWidth = partyWidth - 24;

    // The consignee is a party in its own right, but is optional on the
    // record — fall back to the delivery details the booking already carries
    // so the box is never blank.
    const consignee = {
      name: dash(booking.consigneeName || booking.toPlace),
      address: dash(booking.consigneeAddress || booking.deliveryAddress),
      phone: dash(booking.consigneePhone),
      gstin: dash(booking.consigneeGstin),
    };

    // Before anyone keys in invoices, the booking's own parcel details are
    // still the truth about what is moving — print them as a single row rather
    // than an empty table.
    const allGoodsRows = booking.goodsItems.length
      ? booking.goodsItems.map((item) => ({
          invoiceNo: item.invoiceNo || '-',
          invoiceDate: formatDate(item.invoiceDate),
          description: item.description,
          units: item.units,
          goodsValue: num(item.goodsValue),
          ewayBillNo: item.ewayBillNo || '-',
          ewayBillDate: formatDate(item.ewayBillDate),
        }))
      : [
          {
            invoiceNo: '-',
            invoiceDate: '-',
            description: dash(booking.parcelType),
            units: booking.packages ?? 0,
            goodsValue: 0,
            ewayBillNo: '-',
            ewayBillDate: '-',
          },
        ];

    // Totals always cover every row, including any the page has no room to
    // print — the figure at the foot of the table must describe the whole
    // consignment, not just the visible part of it.
    const totalUnits = allGoodsRows.reduce((sum, row) => sum + row.units, 0);
    const totalGoodsValue = allGoodsRows.reduce((sum, row) => sum + row.goodsValue, 0);

    const remarks = booking.remarks || booking.instructions || '';

    // ----- Elastic layout -------------------------------------------------
    /** Natural height of a party box, driven by how far its address wraps. */
    const partyNaturalH = (address: string) =>
      92 + doc.font('Helvetica').fontSize(8.5).heightOfString(address, { width: partyTextWidth });

    const consignorAddress = dash(booking.pickupAddress);
    const partyH = clamp(
      Math.max(partyNaturalH(consignorAddress), partyNaturalH(consignee.address)),
      PARTY_MIN_H,
      PARTY_MAX_H
    );

    const remarksTextWidth = CONTENT_WIDTH - 90;
    const remarksH = clamp(
      doc.font('Helvetica').fontSize(8.5).heightOfString(remarks, { width: remarksTextWidth }) + 26,
      REMARKS_MIN_H,
      REMARKS_MAX_H
    );

    // Whatever the two other elastic blocks did not take belongs to the goods
    // table. Rows are drawn at their natural height where they fit and
    // compressed towards GOODS_ROW_MIN_H where they do not.
    const goodsBudget = ELASTIC_BUDGET - partyH - remarksH;
    const rowsBudget = Math.max(goodsBudget - GOODS_CHROME_H, GOODS_ROW_MIN_H);
    const maxRows = Math.max(Math.floor(rowsBudget / GOODS_ROW_MIN_H), 1);

    // More rows than the sheet can hold: print what fits, and spend the last
    // row saying so. Dropping rows silently from a document a consignee
    // reconciles against would be far worse than an explicit short-fall note.
    const overflowing = allGoodsRows.length > maxRows;
    const goodsRows = overflowing ? allGoodsRows.slice(0, maxRows - 1) : allGoodsRows;
    const printedRowCount = goodsRows.length + (overflowing ? 1 : 0);
    const goodsRowH = clamp(rowsBudget / printedRowCount, GOODS_ROW_MIN_H, GOODS_ROW_MAX_H);
    const goodsTableH = GOODS_CHROME_H + printedRowCount * goodsRowH;

    let y = PAGE_MARGIN;

    // ----- Header ---------------------------------------------------------
    const logoPath = resolveLogoPath();
    let brandX = PAGE_MARGIN;
    if (logoPath) {
      doc.image(logoPath, PAGE_MARGIN, y - 2, { fit: [86, 86] });
      brandX = PAGE_MARGIN + 96;
    }

    const brandWidth = 250;
    text(doc, COMPANY.name, brandX, y + 4, brandWidth, { size: 21, bold: true });
    let brandY = y + 32;
    for (const line of COMPANY.addressLines) {
      text(doc, line, brandX, brandY, brandWidth, { size: 8.5, color: MUTED });
      brandY += 12;
    }
    text(doc, COMPANY.contact, brandX, brandY, brandWidth + 30, { size: 8, color: MUTED });
    text(doc, COMPANY.gstin, brandX, brandY + 14, brandWidth, { size: 8.5, bold: true });

    // Document identity, in two columns on the right.
    const idLabelX = 392;
    const idValueX = 462;
    const idRows: [string, string][] = [
      ['LR No.', booking.lrNumber ?? '-'],
      ['LR Date', formatDate(booking.lrGeneratedAt ?? booking.createdAt)],
      ['From', dash(booking.fromPlace)],
      ['To', dash(booking.toPlace)],
    ];
    let idY = y + 6;
    for (const [key, value] of idRows) {
      text(doc, key, idLabelX, idY, 68, { size: 8.5, bold: true, color: MUTED });
      text(doc, value, idValueX, idY, RIGHT_EDGE - idValueX, { size: 9, bold: true, height: 11 });
      idY += 19;
    }

    y += HEADER_H;
    hLine(doc, PAGE_MARGIN, RIGHT_EDGE, y, 1, INK);
    y += HEADER_GAP;

    // ----- Vehicle strip --------------------------------------------------
    const vehicleColumns: Column[] = [
      { width: 85, title: 'Vehicle Number', align: 'center' },
      { width: 80, title: 'Driver Number', align: 'center' },
      { width: 75, title: 'Vehicle Type', align: 'center' },
      { width: 82, title: 'Transport Mode', align: 'center' },
      { width: 85, title: 'Payment Term', align: 'center' },
      { width: CONTENT_WIDTH - 407, title: 'Dispatch Date & Time', align: 'center' },
    ];

    tableRow(doc, vehicleColumns, vehicleColumns.map((c) => c.title), y, VEHICLE_HEADER_H, {
      size: 7.5,
      bold: true,
      fill: FILL,
    });
    hLine(doc, PAGE_MARGIN, RIGHT_EDGE, y + VEHICLE_HEADER_H);
    tableRow(
      doc,
      vehicleColumns,
      [
        dash(booking.vehicleNumber),
        dash(booking.driverMobile),
        dash(booking.vehicleTypeName ?? booking.vehicleTypeRequested),
        label(TRANSPORT_MODE_LABELS, booking.transportMode),
        dash(booking.paymentTerm),
        formatDateTime(booking.dispatchAt),
      ],
      y + VEHICLE_HEADER_H,
      VEHICLE_VALUE_H,
      { size: 8.5 }
    );
    strokeRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, VEHICLE_H);
    y += VEHICLE_H + GAP;

    // ----- Consignor / Consignee -----------------------------------------
    const drawParty = (
      x: number,
      title: string,
      name: string,
      address: string,
      phone: string,
      gstin: string
    ) => {
      strokeRect(doc, x, y, partyWidth, partyH);
      text(doc, title, x + 12, y + 12, partyTextWidth, { size: 8, bold: true, color: MUTED });
      text(doc, name, x + 12, y + 30, partyTextWidth, { size: 9.5, bold: true, height: 12 });
      // The address gets whatever the box has left between the name and the
      // two contact lines pinned to its foot.
      text(doc, address, x + 12, y + 46, partyTextWidth, { size: 8.5, height: partyH - 46 - 34 });
      text(doc, `Phone: ${phone}`, x + 12, y + partyH - 32, partyTextWidth, { size: 8.5, bold: true, height: 11 });
      text(doc, `GSTIN: ${gstin}`, x + 12, y + partyH - 18, partyTextWidth, { size: 8.5, bold: true, height: 11 });
    };

    drawParty(
      PAGE_MARGIN,
      'CONSIGNOR (FROM)',
      dash(booking.customerName),
      consignorAddress,
      dash(booking.mobile),
      dash(booking.consignorGstin)
    );
    drawParty(
      PAGE_MARGIN + partyWidth + 10,
      'CONSIGNEE (TO)',
      consignee.name,
      consignee.address,
      consignee.phone,
      consignee.gstin
    );
    y += partyH + GAP;

    // ----- Goods details --------------------------------------------------
    const goodsColumns: Column[] = [
      { width: 72, title: 'Invoice No.', align: 'center' },
      { width: 62, title: 'Invoice Date', align: 'center' },
      { width: 118, title: 'Description of Goods', align: 'center' },
      { width: 55, title: 'No. of Units', align: 'center' },
      { width: 75, title: `Goods Value (${RUPEE})`, align: 'center' },
      { width: 83, title: 'E-Way Bill No.', align: 'center' },
      { width: CONTENT_WIDTH - 465, title: 'E-Way Bill Date', align: 'center' },
    ];

    const goodsTop = y;
    fillRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, GOODS_TITLE_H, FILL);
    cell(doc, 'GOODS DETAILS', PAGE_MARGIN, y, CONTENT_WIDTH, GOODS_TITLE_H, {
      size: 9,
      bold: true,
      align: 'center',
    });
    hLine(doc, PAGE_MARGIN, RIGHT_EDGE, y + GOODS_TITLE_H);
    y += GOODS_TITLE_H;

    tableRow(doc, goodsColumns, goodsColumns.map((c) => c.title), y, GOODS_HEADER_H, { size: 7.5, bold: true });
    hLine(doc, PAGE_MARGIN, RIGHT_EDGE, y + GOODS_HEADER_H);
    y += GOODS_HEADER_H;

    const goodsRowSize = Math.min(8, goodsRowH - 4);
    for (const row of goodsRows) {
      tableRow(
        doc,
        goodsColumns,
        [
          row.invoiceNo,
          row.invoiceDate,
          row.description,
          String(row.units),
          formatAmount(row.goodsValue),
          row.ewayBillNo,
          row.ewayBillDate,
        ],
        y,
        goodsRowH,
        { size: goodsRowSize }
      );
      hLine(doc, PAGE_MARGIN, RIGHT_EDGE, y + goodsRowH);
      y += goodsRowH;
    }

    if (overflowing) {
      const hidden = allGoodsRows.length - goodsRows.length;
      cell(
        doc,
        `+ ${hidden} more item${hidden === 1 ? '' : 's'} — see the attached invoice list. Totals below cover all items.`,
        PAGE_MARGIN,
        y,
        CONTENT_WIDTH,
        goodsRowH,
        { size: goodsRowSize, bold: true, align: 'center' }
      );
      hLine(doc, PAGE_MARGIN, RIGHT_EDGE, y + goodsRowH);
      y += goodsRowH;
    }

    // Total row: the first two columns stay blank and "Total:" sits under the
    // description, exactly where the eye expects it on a printed LR.
    tableRow(
      doc,
      goodsColumns,
      ['', '', 'Total:', String(totalUnits), formatAmount(totalGoodsValue), '', ''],
      y,
      GOODS_TOTAL_H,
      { size: 8.5, bold: true }
    );
    y += GOODS_TOTAL_H;
    strokeRect(doc, PAGE_MARGIN, goodsTop, CONTENT_WIDTH, goodsTableH);
    y = goodsTop + goodsTableH + GAP;

    // ----- Freight & charges / payment details ----------------------------
    // The four charge lines are the LR's itemised view; freightAmount is the
    // single agreed price Operations works from. Where nothing has been
    // itemised yet, fall back to that so the document still shows a figure.
    const charges: [string, number][] = [
      ['Freight Charges', num(booking.freightCharges)],
      ['Loading Charges', num(booking.loadingCharges)],
      ['Unloading Charges', num(booking.unloadingCharges)],
      ['Other Charges', num(booking.otherCharges)],
    ];
    const itemisedTotal = charges.reduce((sum, [, amount]) => sum + amount, 0);
    const totalFreight = itemisedTotal || num(booking.freightAmount);
    const advance = num(booking.advanceReceived);
    const balance = Math.max(totalFreight - advance, 0);

    const moneyTextWidth = partyWidth - 24;

    // Freight & charges (left)
    fillRect(doc, PAGE_MARGIN, y, partyWidth, 22, FILL);
    strokeRect(doc, PAGE_MARGIN, y, partyWidth, MONEY_H);
    cell(doc, 'FREIGHT & CHARGES', PAGE_MARGIN, y, partyWidth, 22, { size: 8.5, bold: true, align: 'center' });
    hLine(doc, PAGE_MARGIN, PAGE_MARGIN + partyWidth, y + 22);

    let chargeY = y + 32;
    for (const [name, amount] of charges) {
      text(doc, name, PAGE_MARGIN + 12, chargeY, moneyTextWidth * 0.6, { size: 8.5, height: 11 });
      text(doc, `${RUPEE} ${formatAmount(amount)}`, PAGE_MARGIN + 12, chargeY, moneyTextWidth, {
        size: 8.5,
        align: 'right',
        height: 11,
      });
      chargeY += 16;
    }
    hLine(doc, PAGE_MARGIN + 12, PAGE_MARGIN + partyWidth - 12, chargeY + 2, 0.7, INK);
    text(doc, 'TOTAL FREIGHT', PAGE_MARGIN + 12, chargeY + 11, moneyTextWidth * 0.6, { size: 10, bold: true, height: 13 });
    text(doc, `${RUPEE} ${formatAmount(totalFreight)}`, PAGE_MARGIN + 12, chargeY + 11, moneyTextWidth, {
      size: 10,
      bold: true,
      align: 'right',
      height: 13,
    });

    // Payment details (right)
    const payX = PAGE_MARGIN + partyWidth + 10;
    fillRect(doc, payX, y, partyWidth, 22, FILL);
    strokeRect(doc, payX, y, partyWidth, MONEY_H);
    cell(doc, 'PAYMENT DETAILS', payX, y, partyWidth, 22, { size: 8.5, bold: true, align: 'center' });
    hLine(doc, payX, payX + partyWidth, y + 22);

    const paymentRows: [string, string][] = [
      ['Freight Payment', label(FREIGHT_PAYMENT_LABELS, booking.freightPayment)],
      ['Payment Terms', booking.paymentTerm || '-'],
      ['Billing Party', label(PARTY_LABELS, booking.billingParty)],
      ['Freight Payer', label(PARTY_LABELS, booking.freightPayer)],
      ['Advance Received', `${RUPEE} ${formatAmount(advance)}`],
      ['Balance Amount', `${RUPEE} ${formatAmount(balance)}`],
    ];
    let payY = y + 32;
    for (const [key, value] of paymentRows) {
      text(doc, key, payX + 12, payY, 96, { size: 8.5, height: 11 });
      text(doc, ':', payX + 112, payY, 6, { size: 8.5, height: 11 });
      text(doc, value, payX + 124, payY, partyWidth - 136, { size: 8.5, height: 11 });
      payY += 16;
    }
    y += MONEY_H + GAP;

    // ----- Remarks --------------------------------------------------------
    // `remarks` is what the operator wrote for the document; `instructions` is
    // what the customer wrote at booking. Prefer the former, print the latter
    // when there is nothing else, and leave the box empty for a handwritten
    // note when there is neither.
    strokeRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, remarksH);
    text(doc, 'Remarks:', PAGE_MARGIN + 12, y + 13, 60, { size: 8.5, bold: true, height: 11 });
    if (remarks) {
      text(doc, remarks, PAGE_MARGIN + 72, y + 13, remarksTextWidth, { size: 8.5, height: remarksH - 20 });
    }

    // ----- Blank band ------------------------------------------------------
    // The document ends at the remarks box. Everything from there to the
    // bottom margin is deliberately left empty — see BLANK_H.

    doc.end();
  });
}
