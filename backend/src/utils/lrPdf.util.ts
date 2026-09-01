import { BookingWithRelations } from '../repositories/booking.repository';
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
  formatDateTime,
  num,
  formatAmount,
  clamp,
  dash,
  strokeRect,
  fillRect,
  hLine,
  vLine,
  text,
  cell,
  tableRow,
  drawLetterhead,
  type Column,
} from './pdfBrand.util';

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

// ---------------------------------------------------------------------------
// LR-specific labels
// ---------------------------------------------------------------------------

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
    drawLetterhead(doc, y);

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
