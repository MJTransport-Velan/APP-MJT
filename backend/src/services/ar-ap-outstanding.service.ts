/**
 * Outstanding & Aging — pure read-side computations, no new stored table
 * (Phase 10 design doc §12). Buckets: CURRENT, 1-30, 31-60, 61-90, 91-180, 180+.
 */
import { prisma } from '../config/db';
import { partyOutstandingService } from './party-outstanding.service';

type Bucket = 'CURRENT' | '1-30' | '31-60' | '61-90' | '91-180' | '180+';

function bucketFor(dueDate: Date | null, today: Date): Bucket {
  if (!dueDate) return 'CURRENT';
  const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
  if (daysOverdue <= 0) return 'CURRENT';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  if (daysOverdue <= 180) return '91-180';
  return '180+';
}

export const arApOutstandingService = {
  /**
   * One customer's unpaid invoices, with any opening balance listed first —
   * it is money owed exactly like an invoice is, and leaving it out made
   * this list disagree with every total built from it.
   */
  async customerOutstanding(companyId: string) {
    const openingLines = await partyOutstandingService.customerOpeningLines(companyId);
    const invoices = await prisma.invoice.findMany({
      where: { companyId, deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, outstandingAmount: { gt: 0 } },
      select: { id: true, invoiceNumber: true, invoiceDate: true, dueDate: true, totalAmount: true, paidAmount: true, outstandingAmount: true },
      orderBy: { invoiceDate: 'asc' },
    });
    const today = new Date();
    return [
      ...openingLines.map((line) => ({
        id: line.id,
        isOpening: true,
        invoiceNumber: line.reference,
        invoiceDate: line.date,
        dueDate: line.dueDate,
        totalAmount: line.totalAmount,
        paidAmount: line.paidAmount,
        outstandingAmount: line.outstandingAmount,
        bucket: bucketFor(line.dueDate, today),
      })),
      ...invoices.map((inv) => ({ ...inv, isOpening: false, bucket: bucketFor(inv.dueDate, today) })),
    ];
  },

  /** One supplier's unpaid bills, with any opening balance listed first. */
  async supplierOutstanding(supplierId: string) {
    const openingLines = await partyOutstandingService.supplierOpeningLines(supplierId);
    const bills = await prisma.supplierBill.findMany({
      where: { supplierId, deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, outstandingAmount: { gt: 0 } },
      select: { id: true, billNumber: true, billDate: true, dueDate: true, totalAmount: true, paidAmount: true, outstandingAmount: true, retentionAmount: true },
      orderBy: { billDate: 'asc' },
    });
    const today = new Date();
    return [
      ...openingLines.map((line) => ({
        id: line.id,
        isOpening: true,
        billNumber: line.reference,
        billDate: line.date,
        dueDate: line.dueDate,
        totalAmount: line.totalAmount,
        paidAmount: line.paidAmount,
        outstandingAmount: line.outstandingAmount,
        retentionAmount: 0,
        bucket: bucketFor(line.dueDate, today),
      })),
      ...bills.map((bill) => ({ ...bill, isOpening: false, bucket: bucketFor(bill.dueDate, today) })),
    ];
  },

  /**
   * Customer-wise grouping. Delegates to the shared party-outstanding model
   * so this screen, the Outstanding tabs and the reports cannot drift into
   * reporting three different figures for the same customer.
   *
   * `opening` and `current` are carried alongside the total: an opening
   * balance ages from the date it was carried over, so it lands in a real
   * bucket rather than sitting in CURRENT forever, but the user still needs
   * to see how much of the debt came across from the old books.
   */
  async customerAging() {
    const rows = await partyOutstandingService.customerRows();
    return rows.map((r) => ({
      companyId: r.partyId,
      companyName: r.partyName,
      opening: r.opening,
      current: r.current,
      buckets: r.buckets,
      total: r.total,
    }));
  },

  /** Supplier-wise grouping, including opening payables. */
  async supplierAging() {
    const rows = await partyOutstandingService.supplierRows();
    return rows.map((r) => ({
      supplierId: r.partyId,
      supplierName: r.partyName,
      opening: r.opening,
      current: r.current,
      buckets: r.buckets,
      total: r.total,
    }));
  },
};
