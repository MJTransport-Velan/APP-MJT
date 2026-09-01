/**
 * Tax Invoice PDF — the printable form of an Invoice, on the same MJ Transport
 * letterhead as the Lorry Receipt (shared with it in pdfBrand.util.ts).
 *
 * Unlike the LR, an invoice is not budgeted to a single sheet: it bills an
 * arbitrary number of trips, so the trip table paginates and every page after
 * the first opens with a compact continuation header. The money block, the
 * amount in words and the signature panel are always kept together on the
 * final page — a total stranded on a page of its own is how a disputed
 * invoice starts.
 */
import { InvoiceForPdf } from '../repositories/invoice.repository';
import {
  PDFDocument,
  COMPANY,
  INK,
  MUTED,
  LINE,
  FILL,
  RUPEE,
  PAGE_MARGIN,
  CONTENT_WIDTH,
  RIGHT_EDGE,
  PAGE_BOTTOM,
  formatDate,
  num,
  formatAmount,
  dash,
  strokeRect,
  fillRect,
  hLine,
  text,
  cell,
  tableRow,
  drawLetterhead,
  type Column,
} from './pdfBrand.util';

const HEADER_H = 88;
const HEADER_GAP = 10;
const TITLE_H = 26;
const PARTY_H = 96;
const TABLE_HEADER_H = 22;
const ROW_H = 20;
const SIGN_H = 70;
const GAP = 12;

/** Room the closing blocks need on the last page, measured from the table down. */
const MONEY_BLOCK_H = 150;

// ---------------------------------------------------------------------------
// Amount in words — Indian numbering
// ---------------------------------------------------------------------------

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const rest = n % 10;
  return TENS[tens] + (rest ? ` ${ONES[rest]}` : '');
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/**
 * "Rupees One Lakh Twenty Three Thousand Four Hundred and Fifty Paise Only" —
 * an Indian tax invoice is expected to carry the total in words, grouped as
 * crore / lakh / thousand rather than in millions.
 */
export function amountInWords(value: number): string {
  const rounded = Math.round(Math.abs(value) * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const words: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  if (crore) words.push(`${threeDigits(crore)} Crore`);
  if (lakh) words.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) words.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) words.push(threeDigits(hundred));

  const rupeeWords = words.length ? words.join(' ') : 'Zero';
  const sign = value < 0 ? 'Minus ' : '';
  const paiseWords = paise ? ` and ${twoDigits(paise)} Paise` : '';
  return `${sign}Rupees ${rupeeWords}${paiseWords} Only`;
}

// ---------------------------------------------------------------------------
// Tax presentation
// ---------------------------------------------------------------------------

interface TaxLine {
  label: string;
  amount: number;
}

/**
 * Splits the invoice's stored tax into the CGST/SGST/IGST lines a GST invoice
 * has to show. The stored `taxAmount` is what the customer is actually being
 * charged, so if the components derived from the rate master do not add up to
 * it — a hand-edited invoice, or a rate changed after the fact — the split is
 * abandoned and one honest "Tax" line is printed instead. A printed invoice
 * whose tax lines do not sum to its total is worse than one with less detail.
 */
function taxLines(invoice: InvoiceForPdf, subtotal: number, taxAmount: number): TaxLine[] {
  const gst = invoice.gstMaster;
  if (!gst || taxAmount === 0) {
    return taxAmount === 0 ? [] : [{ label: 'Tax', amount: taxAmount }];
  }

  const rates: [string, number][] = [
    ['CGST', num(gst.cgstRatePercent)],
    ['SGST', num(gst.sgstRatePercent)],
    ['IGST', num(gst.igstRatePercent)],
    ['Cess', num(gst.cessRatePercent)],
  ];

  const lines = rates
    .filter(([, rate]) => rate > 0)
    .map(([name, rate]) => ({
      label: `${name} @ ${rate}%`,
      amount: Math.round(((subtotal * rate) / 100) * 100) / 100,
    }));

  if (!lines.length) return [{ label: `Tax @ ${num(gst.ratePercent)}%`, amount: taxAmount }];

  const sum = lines.reduce((s, l) => s + l.amount, 0);
  if (Math.abs(sum - taxAmount) > 0.05) return [{ label: 'Tax', amount: taxAmount }];
  return lines;
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

const TRIP_COLUMNS: Column[] = [
  { width: 28, title: '#', align: 'center' },
  { width: 96, title: 'Trip No.', align: 'left' },
  { width: 215, title: 'Route', align: 'left' },
  { width: 92, title: 'Completed', align: 'center' },
  { width: CONTENT_WIDTH - 431, title: `Freight (${RUPEE})`, align: 'right' },
];

/** Draws the page chrome and returns the y the body starts at. */
function drawPageHeader(doc: PDFKit.PDFDocument, invoice: InvoiceForPdf, isFirstPage: boolean): number {
  let y = PAGE_MARGIN;

  if (!isFirstPage) {
    text(doc, COMPANY.name, PAGE_MARGIN, y, 300, { size: 12, bold: true });
    text(doc, `Tax Invoice ${invoice.invoiceNumber} (continued)`, PAGE_MARGIN, y + 16, 300, {
      size: 8.5,
      color: MUTED,
    });
    y += 34;
    hLine(doc, PAGE_MARGIN, RIGHT_EDGE, y, 1, INK);
    return y + HEADER_GAP;
  }

  drawLetterhead(doc, y);

  // Document identity, in two columns on the right — same shape as the LR's.
  const idLabelX = 392;
  const idValueX = 462;
  const idRows: [string, string][] = [
    ['Invoice No.', invoice.invoiceNumber],
    ['Invoice Date', formatDate(invoice.invoiceDate)],
    ['Due Date', formatDate(invoice.dueDate)],
    ['Status', invoice.status],
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

  // ----- Title band -------------------------------------------------------
  fillRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, TITLE_H, FILL);
  strokeRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, TITLE_H);
  cell(doc, 'TAX INVOICE', PAGE_MARGIN, y, CONTENT_WIDTH, TITLE_H, { size: 12, bold: true, align: 'center' });
  y += TITLE_H + GAP;

  // ----- Bill To ----------------------------------------------------------
  const company = invoice.company;
  strokeRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, PARTY_H);
  fillRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, 18, FILL);
  cell(doc, 'BILL TO', PAGE_MARGIN, y, CONTENT_WIDTH, 18, { size: 8, bold: true, color: MUTED });

  const innerY = y + 24;
  text(doc, dash(company.name), PAGE_MARGIN + 8, innerY, 330, { size: 11, bold: true });
  text(doc, dash(company.address), PAGE_MARGIN + 8, innerY + 16, 330, { size: 8.5, color: MUTED, height: 30 });

  const rightX = PAGE_MARGIN + 350;
  const detailRows: [string, string][] = [
    ['GSTIN', dash(company.gstNumber)],
    ['PAN', dash(company.panNumber)],
    ['Phone', dash(company.phone)],
    ['Email', dash(company.email)],
  ];
  let detailY = innerY;
  for (const [key, value] of detailRows) {
    text(doc, key, rightX, detailY, 44, { size: 8, bold: true, color: MUTED });
    text(doc, value, rightX + 48, detailY, RIGHT_EDGE - rightX - 56, { size: 8.5, height: 10 });
    detailY += 15;
  }

  return y + PARTY_H + GAP;
}

/** Repeats the trip table's header band, used at the top of every page it spans. */
function drawTripTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  tableRow(doc, TRIP_COLUMNS, TRIP_COLUMNS.map((c) => c.title), y, TABLE_HEADER_H, {
    size: 8,
    bold: true,
    fill: FILL,
  });
  strokeRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, TABLE_HEADER_H);
  return y + TABLE_HEADER_H;
}

/**
 * Renders the invoice and resolves the complete buffer. Buffering rather than
 * piping straight to the response means a failure mid-render still surfaces as
 * a clean JSON error instead of a truncated file.
 */
export function buildInvoicePdf(invoice: InvoiceForPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Everything is positioned absolutely, so PDFKit's own pagination would
    // only ever fire by accident. Pages are added deliberately below.
    doc.page.margins.bottom = 0;

    const subtotal = num(invoice.subtotal);
    const taxAmount = num(invoice.taxAmount);
    const totalAmount = num(invoice.totalAmount);
    const paidAmount = num(invoice.paidAmount);
    const outstandingAmount = num(invoice.outstandingAmount);

    const tripRows = invoice.trips.map((trip, index) => [
      String(index + 1),
      dash(trip.tripNumber),
      `${dash(trip.fromLocation?.name)} - ${dash(trip.toLocation?.name)}`,
      formatDate(trip.actualEndDate ?? trip.scheduledStartDate),
      formatAmount(num(trip.freightAmount)),
    ]);

    const chargeRows = invoice.charges.map((charge) => [
      charge.description || charge.chargeType.replace(/_/g, ' '),
      formatAmount(num(charge.amount)),
    ]);

    let y = drawPageHeader(doc, invoice, true);

    // ----- Trip table -------------------------------------------------------
    text(doc, 'Trips Billed', PAGE_MARGIN, y, 300, { size: 9.5, bold: true });
    y += 16;
    y = drawTripTableHeader(doc, y);

    const continueTableOnNewPage = () => {
      doc.addPage();
      const top = drawPageHeader(doc, invoice, false);
      return drawTripTableHeader(doc, top);
    };

    let tableTop = y - TABLE_HEADER_H;
    if (!tripRows.length) {
      tableRow(doc, TRIP_COLUMNS, ['', '-', 'No trips billed on this invoice', '', formatAmount(0)], y, ROW_H, {
        size: 8.5,
      });
      y += ROW_H;
    }

    for (const row of tripRows) {
      // Leave room for the closing blocks; overflowing them onto a page of
      // their own is what a reserved footer budget exists to prevent.
      if (y + ROW_H > PAGE_BOTTOM - 20) {
        strokeRect(doc, PAGE_MARGIN, tableTop, CONTENT_WIDTH, y - tableTop);
        y = continueTableOnNewPage();
        tableTop = y - TABLE_HEADER_H;
      }
      tableRow(doc, TRIP_COLUMNS, row, y, ROW_H, { size: 8.5 });
      hLine(doc, PAGE_MARGIN, RIGHT_EDGE, y);
      y += ROW_H;
    }
    strokeRect(doc, PAGE_MARGIN, tableTop, CONTENT_WIDTH, y - tableTop);
    y += GAP;

    // ----- Additional charges ----------------------------------------------
    if (chargeRows.length) {
      const chargeColumns: Column[] = [
        { width: CONTENT_WIDTH - 120, title: 'Additional Charges', align: 'left' },
        { width: 120, title: `Amount (${RUPEE})`, align: 'right' },
      ];
      const chargeBlockH = TABLE_HEADER_H + chargeRows.length * ROW_H;
      if (y + chargeBlockH + MONEY_BLOCK_H > PAGE_BOTTOM) {
        doc.addPage();
        y = drawPageHeader(doc, invoice, false);
      }
      const chargeTop = y;
      tableRow(doc, chargeColumns, chargeColumns.map((c) => c.title), y, TABLE_HEADER_H, {
        size: 8,
        bold: true,
        fill: FILL,
      });
      y += TABLE_HEADER_H;
      for (const row of chargeRows) {
        hLine(doc, PAGE_MARGIN, RIGHT_EDGE, y);
        tableRow(doc, chargeColumns, row, y, ROW_H, { size: 8.5 });
        y += ROW_H;
      }
      strokeRect(doc, PAGE_MARGIN, chargeTop, CONTENT_WIDTH, y - chargeTop);
      y += GAP;
    }

    // ----- Money block ------------------------------------------------------
    const lines = taxLines(invoice, subtotal, taxAmount);
    const moneyRows: [string, number, boolean][] = [
      ['Subtotal', subtotal, false],
      ...lines.map((l) => [l.label, l.amount, false] as [string, number, boolean]),
      ['Total', totalAmount, true],
      ['Paid', paidAmount, false],
      ['Outstanding', outstandingAmount, true],
    ];
    const moneyH = moneyRows.length * 18 + 10;

    if (y + moneyH + SIGN_H + 40 > PAGE_BOTTOM) {
      doc.addPage();
      y = drawPageHeader(doc, invoice, false);
    }

    const moneyX = PAGE_MARGIN + CONTENT_WIDTH - 240;
    strokeRect(doc, moneyX, y, 240, moneyH);
    let moneyY = y + 6;
    for (const [labelText, amount, bold] of moneyRows) {
      if (labelText === 'Total' || labelText === 'Outstanding') hLine(doc, moneyX, moneyX + 240, moneyY - 2);
      text(doc, labelText, moneyX + 10, moneyY + 3, 120, { size: 8.5, bold, color: bold ? INK : MUTED });
      text(doc, `${RUPEE} ${formatAmount(amount)}`, moneyX + 120, moneyY + 3, 110, {
        size: bold ? 9.5 : 8.5,
        bold,
        align: 'right',
      });
      moneyY += 18;
    }

    // Amount in words sits beside the money box, filling the space to its left.
    text(doc, 'Amount in Words', PAGE_MARGIN, y + 6, 200, { size: 8, bold: true, color: MUTED });
    text(doc, amountInWords(totalAmount), PAGE_MARGIN, y + 20, CONTENT_WIDTH - 260, {
      size: 9,
      bold: true,
      height: 44,
    });

    if (invoice.notes) {
      text(doc, 'Notes', PAGE_MARGIN, y + 68, 200, { size: 8, bold: true, color: MUTED });
      text(doc, invoice.notes, PAGE_MARGIN, y + 80, CONTENT_WIDTH - 260, { size: 8.5, color: MUTED, height: 32 });
    }

    y += moneyH + GAP;

    // ----- Signature panel --------------------------------------------------
    const signY = Math.max(y, PAGE_BOTTOM - SIGN_H - 26);
    hLine(doc, PAGE_MARGIN, RIGHT_EDGE, signY);
    text(doc, 'Declaration', PAGE_MARGIN, signY + 8, 300, { size: 8, bold: true, color: MUTED });
    text(
      doc,
      'We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.',
      PAGE_MARGIN,
      signY + 20,
      300,
      { size: 7.5, color: MUTED, height: 30 }
    );
    text(doc, `For ${COMPANY.name}`, RIGHT_EDGE - 200, signY + 8, 200, { size: 9, bold: true, align: 'right' });
    text(doc, 'Authorised Signatory', RIGHT_EDGE - 200, signY + SIGN_H - 12, 200, {
      size: 8,
      color: MUTED,
      align: 'right',
    });

    // ----- Page numbers -----------------------------------------------------
    // Written after the fact: the total page count is only known once the
    // trip table has finished paginating.
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      text(doc, `Page ${i + 1} of ${range.count}`, PAGE_MARGIN, PAGE_BOTTOM - 10, CONTENT_WIDTH, {
        size: 7.5,
        color: MUTED,
        align: 'right',
      });
    }

    doc.end();
  });
}

/** Filesystem-safe name — invoice numbers carry slashes a browser would read as a path. */
export function invoiceFileName(invoiceNumber: string): string {
  return `${invoiceNumber.replace(/[\\/:*?"<>|]+/g, '-')}.pdf`;
}
