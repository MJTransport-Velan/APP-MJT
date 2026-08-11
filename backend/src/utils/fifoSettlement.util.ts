/**
 * Phase 15 — Business Financial Entry. When a Financial Entry pays a
 * Customer/Supplier a lump sum with no specific Invoice/Bill/Trip chosen
 * (Financial Entry never exposes that picker — that's the whole point),
 * this plans how that lump sum actually gets applied: oldest outstanding
 * item first, each filled in full before moving to the next, and
 * whatever's left over once everything is cleared becomes a fresh advance.
 * Pure planning — no writes happen here; financial-entry.service.ts
 * executes the plan through the real Receipt/SupplierPayment services so
 * every existing recalculation (Invoice.recalcInvoice, etc.) still fires.
 */
import { prisma } from '../config/db';

export interface SettlementPlanItem {
  targetType: 'INVOICE' | 'BILL' | 'TRIP' | 'ADVANCE';
  targetId: string | null;
  targetLabel: string;
  amount: number;
}

export async function planCustomerSettlement(companyId: string, amount: number): Promise<SettlementPlanItem[]> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, outstandingAmount: { gt: 0 } },
    select: { id: true, invoiceNumber: true, outstandingAmount: true },
    orderBy: [{ invoiceDate: 'asc' }, { createdAt: 'asc' }],
  });

  const plan: SettlementPlanItem[] = [];
  let remaining = amount;
  for (const inv of invoices) {
    if (remaining <= 0) break;
    const due = Number(inv.outstandingAmount);
    const apply = Math.min(remaining, due);
    if (apply <= 0) continue;
    plan.push({ targetType: 'INVOICE', targetId: inv.id, targetLabel: inv.invoiceNumber, amount: Number(apply.toFixed(2)) });
    remaining = Number((remaining - apply).toFixed(2));
  }
  if (remaining > 0.001) {
    plan.push({ targetType: 'ADVANCE', targetId: null, targetLabel: 'Advance (unallocated)', amount: remaining });
  }
  return plan;
}

/** Bills first (oldest billDate), then any still-unpaid completed Trips (oldest first) for whatever the bills didn't cover, then leftover as advance. */
export async function planSupplierSettlement(supplierId: string, amount: number): Promise<SettlementPlanItem[]> {
  const plan: SettlementPlanItem[] = [];
  let remaining = amount;

  const bills = await prisma.supplierBill.findMany({
    where: { supplierId, deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, outstandingAmount: { gt: 0 } },
    select: { id: true, billNumber: true, outstandingAmount: true },
    orderBy: [{ billDate: 'asc' }, { createdAt: 'asc' }],
  });
  for (const bill of bills) {
    if (remaining <= 0) break;
    const due = Number(bill.outstandingAmount);
    const apply = Math.min(remaining, due);
    if (apply <= 0) continue;
    plan.push({ targetType: 'BILL', targetId: bill.id, targetLabel: bill.billNumber, amount: Number(apply.toFixed(2)) });
    remaining = Number((remaining - apply).toFixed(2));
  }

  if (remaining > 0.001) {
    const trips = await prisma.trip.findMany({
      where: { supplierId, deletedAt: null, status: 'COMPLETED', supplierRate: { not: null } },
      select: { id: true, tripNumber: true, supplierRate: true, scheduledStartDate: true, createdAt: true },
      orderBy: [{ scheduledStartDate: 'asc' }, { createdAt: 'asc' }],
    });
    if (trips.length > 0) {
      const paidByTrip = await prisma.supplierPayment.groupBy({
        by: ['tripId'],
        where: { tripId: { in: trips.map((t) => t.id) }, deletedAt: null },
        _sum: { amount: true },
      });
      const paidMap = new Map(paidByTrip.map((p) => [p.tripId as string, Number(p._sum.amount || 0)]));

      for (const trip of trips) {
        if (remaining <= 0) break;
        const due = Number(trip.supplierRate) - (paidMap.get(trip.id) || 0);
        if (due <= 0.001) continue;
        const apply = Math.min(remaining, due);
        plan.push({ targetType: 'TRIP', targetId: trip.id, targetLabel: trip.tripNumber, amount: Number(apply.toFixed(2)) });
        remaining = Number((remaining - apply).toFixed(2));
      }
    }
  }

  if (remaining > 0.001) {
    plan.push({ targetType: 'ADVANCE', targetId: null, targetLabel: 'Advance (unallocated)', amount: remaining });
  }
  return plan;
}
