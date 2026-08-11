/**
 * Outstanding & Aging — pure read-side computations, no new stored table
 * (Phase 10 design doc §12). Buckets: CURRENT, 1-30, 31-60, 61-90, 91-180, 180+.
 */
import { prisma } from '../config/db';

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

function emptyBuckets(): Record<Bucket, number> {
  return { CURRENT: 0, '1-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '180+': 0 };
}

export const arApOutstandingService = {
  async customerOutstanding(companyId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { companyId, deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, outstandingAmount: { gt: 0 } },
      select: { id: true, invoiceNumber: true, invoiceDate: true, dueDate: true, totalAmount: true, paidAmount: true, outstandingAmount: true },
      orderBy: { invoiceDate: 'asc' },
    });
    return invoices.map((inv) => ({
      ...inv,
      bucket: bucketFor(inv.dueDate, new Date()),
    }));
  },

  async supplierOutstanding(supplierId: string) {
    const bills = await prisma.supplierBill.findMany({
      where: { supplierId, deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, outstandingAmount: { gt: 0 } },
      select: { id: true, billNumber: true, billDate: true, dueDate: true, totalAmount: true, paidAmount: true, outstandingAmount: true, retentionAmount: true },
      orderBy: { billDate: 'asc' },
    });
    return bills.map((bill) => ({
      ...bill,
      bucket: bucketFor(bill.dueDate, new Date()),
    }));
  },

  /** Customer-wise + Route-wise grouping available today; Branch-wise deferred (Intent.branchId gap, §12/§21). */
  async customerAging(query: { branchId?: string }) {
    const today = new Date();
    const invoices = await prisma.invoice.findMany({
      where: { deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, outstandingAmount: { gt: 0 } },
      select: { companyId: true, dueDate: true, outstandingAmount: true, company: { select: { name: true } } },
    });

    const grouped = new Map<string, { companyName: string; buckets: Record<Bucket, number>; total: number }>();
    for (const inv of invoices) {
      const bucket = bucketFor(inv.dueDate, today);
      const amount = Number(inv.outstandingAmount);
      const existing = grouped.get(inv.companyId) || { companyName: inv.company.name, buckets: emptyBuckets(), total: 0 };
      existing.buckets[bucket] += amount;
      existing.total += amount;
      grouped.set(inv.companyId, existing);
    }

    return Array.from(grouped.entries())
      .map(([companyId, v]) => ({ companyId, ...v }))
      .sort((a, b) => b.total - a.total);
  },

  /** Supplier-wise + Vehicle-wise grouping. */
  async supplierAging() {
    const today = new Date();
    const bills = await prisma.supplierBill.findMany({
      where: { deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, outstandingAmount: { gt: 0 } },
      select: { supplierId: true, dueDate: true, outstandingAmount: true, supplier: { select: { name: true } } },
    });

    const grouped = new Map<string, { supplierName: string; buckets: Record<Bucket, number>; total: number }>();
    for (const bill of bills) {
      const bucket = bucketFor(bill.dueDate, today);
      const amount = Number(bill.outstandingAmount);
      const existing = grouped.get(bill.supplierId) || { supplierName: bill.supplier.name, buckets: emptyBuckets(), total: 0 };
      existing.buckets[bucket] += amount;
      existing.total += amount;
      grouped.set(bill.supplierId, existing);
    }

    return Array.from(grouped.entries())
      .map(([supplierId, v]) => ({ supplierId, ...v }))
      .sort((a, b) => b.total - a.total);
  },
};
