import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { BookingWithRelations } from '../repositories/booking.repository';

const NAVY = '#04192F';
const ORANGE = '#FF7200';
const MUTED = '#5B6B7F';
const LINE = '#D8DEE6';

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 portrait
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

/**
 * The build is a bare `tsc`, so `src/assets` is not copied into `dist/`.
 * Rather than depend on a build step, probe the places the logo can legitimately
 * be in dev and in a compiled deployment, and fall back to a text-only header if
 * it is absent — a missing brand asset should never fail an LR download.
 */
function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'src', 'assets', 'brand', 'mjx-logo.png'),
    path.join(process.cwd(), 'assets', 'brand', 'mjx-logo.png'),
    path.join(__dirname, '..', 'assets', 'brand', 'mjx-logo.png'),
    path.join(__dirname, '..', '..', 'src', 'assets', 'brand', 'mjx-logo.png'),
    path.join(__dirname, '..', '..', '..', 'src', 'assets', 'brand', 'mjx-logo.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(label.toUpperCase(), x, y, { width });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(value || '-', x, y + 11, { width });
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(ORANGE).text(title.toUpperCase(), PAGE_MARGIN, y);
  const lineY = y + 13;
  doc.moveTo(PAGE_MARGIN, lineY).lineTo(PAGE_MARGIN + CONTENT_WIDTH, lineY).lineWidth(0.5).strokeColor(LINE).stroke();
  return lineY + 10;
}

/**
 * Renders the Lorry Receipt as a single-page A4 PDF and resolves the complete
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

    // ----- Header ---------------------------------------------------------
    const logoPath = resolveLogoPath();
    let headerTextX = PAGE_MARGIN;
    if (logoPath) {
      // Logo is 260x164; render to a 52pt box preserving aspect ratio.
      doc.image(logoPath, PAGE_MARGIN, PAGE_MARGIN - 4, { fit: [52, 52] });
      headerTextX = PAGE_MARGIN + 62;
    }

    doc.font('Helvetica-Bold').fontSize(17).fillColor(NAVY).text('MJ EXPRESS', headerTextX, PAGE_MARGIN + 2);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(ORANGE)
      .text('L O G I S T I C S', headerTextX, PAGE_MARGIN + 23);

    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(NAVY)
      .text('LORRY RECEIPT', PAGE_MARGIN, PAGE_MARGIN + 2, { width: CONTENT_WIDTH, align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(`Date: ${formatDate(booking.lrGeneratedAt ?? booking.createdAt)}`, PAGE_MARGIN, PAGE_MARGIN + 21, {
        width: CONTENT_WIDTH,
        align: 'right',
      });

    const ruleY = PAGE_MARGIN + 48;
    doc
      .moveTo(PAGE_MARGIN, ruleY)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, ruleY)
      .lineWidth(1.5)
      .strokeColor(ORANGE)
      .stroke();

    // ----- Document numbers ----------------------------------------------
    const numbersY = ruleY + 14;
    const thirdWidth = CONTENT_WIDTH / 3;
    labelValue(doc, 'LR Number', booking.lrNumber ?? '-', PAGE_MARGIN, numbersY, thirdWidth - 8);
    labelValue(doc, 'Booking Number', booking.bookingNo, PAGE_MARGIN + thirdWidth, numbersY, thirdWidth - 8);
    labelValue(
      doc,
      'Tracking Number',
      booking.trackingNumber ?? '-',
      PAGE_MARGIN + thirdWidth * 2,
      numbersY,
      thirdWidth - 8
    );

    // ----- Route ----------------------------------------------------------
    const routeBoxY = numbersY + 40;
    const routeBoxHeight = 46;
    doc
      .roundedRect(PAGE_MARGIN, routeBoxY, CONTENT_WIDTH, routeBoxHeight, 4)
      .lineWidth(0.7)
      .strokeColor(LINE)
      .stroke();
    labelValue(doc, 'From', booking.fromPlace, PAGE_MARGIN + 14, routeBoxY + 11, CONTENT_WIDTH / 2 - 28);
    labelValue(
      doc,
      'To',
      booking.toPlace,
      PAGE_MARGIN + CONTENT_WIDTH / 2 + 6,
      routeBoxY + 11,
      CONTENT_WIDTH / 2 - 20
    );

    // ----- Consignor & Consignee -----------------------------------------
    let y = sectionTitle(doc, 'Consignor & Consignee', routeBoxY + routeBoxHeight + 18);
    const halfWidth = CONTENT_WIDTH / 2 - 10;

    labelValue(doc, 'Consignor', booking.customerName, PAGE_MARGIN, y, halfWidth);
    labelValue(doc, 'Mobile', booking.mobile, PAGE_MARGIN, y + 28, halfWidth);
    labelValue(doc, 'Pickup Address', booking.pickupAddress, PAGE_MARGIN, y + 56, halfWidth);

    const rightX = PAGE_MARGIN + CONTENT_WIDTH / 2 + 10;
    labelValue(doc, 'Consignee', booking.toPlace, rightX, y, halfWidth);
    labelValue(doc, 'Delivery Address', booking.deliveryAddress, rightX, y + 28, halfWidth);

    // Addresses wrap, so measure the taller column before moving on.
    const addressHeight = Math.max(
      doc.heightOfString(booking.pickupAddress || '-', { width: halfWidth }),
      doc.heightOfString(booking.deliveryAddress || '-', { width: halfWidth })
    );
    y = y + 70 + Math.max(addressHeight, 14) + 16;

    // ----- Shipment details ----------------------------------------------
    y = sectionTitle(doc, 'Shipment Details', y);
    const quarterWidth = CONTENT_WIDTH / 4;
    labelValue(doc, 'Parcel Type', booking.parcelType, PAGE_MARGIN, y, quarterWidth - 8);
    labelValue(doc, 'Packages', String(booking.packages), PAGE_MARGIN + quarterWidth, y, quarterWidth - 8);
    labelValue(
      doc,
      'Weight (approx.)',
      `${booking.weight.toString()} kg`,
      PAGE_MARGIN + quarterWidth * 2,
      y,
      quarterWidth - 8
    );
    labelValue(doc, 'Pickup Date', formatDate(booking.pickupDate), PAGE_MARGIN + quarterWidth * 3, y, quarterWidth - 8);

    // ----- Vehicle details ------------------------------------------------
    y = sectionTitle(doc, 'Vehicle Details', y + 42);
    labelValue(doc, 'Vehicle Type', booking.vehicleTypeName ?? booking.vehicleTypeRequested, PAGE_MARGIN, y, quarterWidth - 8);
    labelValue(doc, 'Vehicle Number', booking.vehicleNumber ?? '-', PAGE_MARGIN + quarterWidth, y, quarterWidth - 8);
    labelValue(doc, 'Driver Name', booking.driverName ?? '-', PAGE_MARGIN + quarterWidth * 2, y, quarterWidth - 8);
    labelValue(doc, 'Driver Mobile', booking.driverMobile ?? '-', PAGE_MARGIN + quarterWidth * 3, y, quarterWidth - 8);

    if (booking.instructions) {
      y = sectionTitle(doc, 'Special Instructions', y + 42);
      doc.font('Helvetica').fontSize(9).fillColor(NAVY).text(booking.instructions, PAGE_MARGIN, y, {
        width: CONTENT_WIDTH,
      });
      y += Math.max(doc.heightOfString(booking.instructions, { width: CONTENT_WIDTH }), 12);
    } else {
      y += 42;
    }

    // ----- Signatures -----------------------------------------------------
    const signatureY = Math.max(y + 46, 640);
    const signatureWidth = CONTENT_WIDTH / 2 - 40;
    for (const [index, caption] of ['Consignor Signature', 'Receiver Signature'].entries()) {
      const x = PAGE_MARGIN + index * (CONTENT_WIDTH / 2 + 20);
      doc
        .moveTo(x, signatureY)
        .lineTo(x + signatureWidth, signatureY)
        .lineWidth(0.7)
        .strokeColor(LINE)
        .stroke();
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(caption, x, signatureY + 6, { width: signatureWidth });
    }

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(MUTED)
      .text(
        'This is a system-generated Lorry Receipt issued by MJ Express Logistics.',
        PAGE_MARGIN,
        760,
        { width: CONTENT_WIDTH, align: 'center' }
      );

    doc.end();
  });
}
