/**
 * Party Outstanding — the one place that answers "what does this customer
 * owe us / what do we owe this supplier", opening balances included.
 *
 * An outstanding figure has two halves and they live in different tables:
 *
 *   opening  — carried over from the previous system, an OpeningBalance row
 *              (RECEIVABLE / PAYABLE). It is a POSITION, never a
 *              transaction, so it exists nowhere in Invoice/SupplierBill.
 *   current  — raised in this system: Invoice / SupplierBill.
 *
 * Every screen that read only the second half was under-reporting the debt,
 * and a party whose whole balance was carried over did not appear at all.
 * Both halves are returned separately as well as summed, so a screen can
 * show where the money came from instead of presenting one merged figure
 * the user cannot reconcile against their old books.
 */
import { prisma } from '../config/db';
import { openingBalanceService } from './opening-balance.service';
import { DateRange, hasRange, rangeWhere } from '../utils/dateRange';

export type AgingBucket = 'CURRENT' | '1-30' | '31-60' | '61-90' | '91-180' | '180+';

export interface PartyOutstandingRow {
  partyId: string;
  partyName: string;
  /** Brought over from the previous system. */
  opening: number;
  /** Raised in this system — invoices / bills still unpaid. */
  current: number;
  total: number;
  /** Six-bucket aging, as the Aging screens report it. */
  buckets: Record<AgingBucket, number>;
  /**
   * Three-tier split, as the Outstanding tabs report it. Both live here
   * because two screens ask this same question with different bucket
   * definitions, and deriving one from the other is not possible.
   */
  bucket0To15: number;
  bucket15Plus: number;
  bucket30Plus: number;
}

export interface PartyOutstandingTotals {
  opening: number;
  current: number;
  total: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function emptyBuckets(): Record<AgingBucket, number> {
  return { CURRENT: 0, '1-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '180+': 0 };
}

function daysOverdue(dueDate: Date | null, today: Date): number {
  if (!dueDate) return 0;
  return Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
}

function bucketFor(dueDate: Date | null, today: Date): AgingBucket {
  const overdue = daysOverdue(dueDate, today);
  if (overdue <= 0) return 'CURRENT';
  if (overdue <= 30) return '1-30';
  if (overdue <= 60) return '31-60';
  if (overdue <= 90) return '61-90';
  if (overdue <= 180) return '91-180';
  return '180+';
}

function blankRow(partyId: string, partyName: string): PartyOutstandingRow {
  return {
    partyId,
    partyName,
    opening: 0,
    current: 0,
    total: 0,
    buckets: emptyBuckets(),
    bucket0To15: 0,
    bucket15Plus: 0,
    bucket30Plus: 0,
  };
}

function addAmount(row: PartyOutstandingRow, amount: number, dueDate: Date | null, today: Date) {
  row.buckets[bucketFor(dueDate, today)] += amount;
  const overdue = daysOverdue(dueDate, today);
  if (overdue > 30) row.bucket30Plus += amount;
  else if (overdue > 15) row.bucket15Plus += amount;
  else row.bucket0To15 += amount;
}

function finalizeRows(rows: Map<string, PartyOutstandingRow>): PartyOutstandingRow[] {
  return Array.from(rows.values())
    .map((r) => ({
      ...r,
      opening: round2(r.opening),
      current: round2(r.current),
      total: round2(r.opening + r.current),
      bucket0To15: round2(r.bucket0To15),
      bucket15Plus: round2(r.bucket15Plus),
      bucket30Plus: round2(r.bucket30Plus),
      buckets: Object.fromEntries(Object.entries(r.buckets).map(([k, v]) => [k, round2(v)])) as Record<AgingBucket, number>,
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * An opening row ages from the date it was carried over, so a migrated
 * balance does not sit in CURRENT forever. Under a date filter a row with
 * no reference date cannot be placed in the window at all, so it is left
 * out rather than assumed to belong there.
 */
function openingRowInRange(referenceDate: Date | null, range: DateRange): boolean {
  if (!hasRange(range)) return true;
  if (!referenceDate) return false;
  if (range.from && referenceDate < range.from) return false;
  if (range.to && referenceDate > range.to) return false;
  return true;
}

function totalsOf(rows: PartyOutstandingRow[]): PartyOutstandingTotals {
  return {
    opening: round2(rows.reduce((s, r) => s + r.opening, 0)),
    current: round2(rows.reduce((s, r) => s + r.current, 0)),
    total: round2(rows.reduce((s, r) => s + r.total, 0)),
  };
}

/**
 * An opening balance shaped like the invoice/bill rows the detail tables
 * already render, so it can be listed alongside them instead of being an
 * invisible difference in the total.
 */
function openingLine(id: string, referenceNumber: string | null, referenceDate: Date | null, amount: number) {
  return {
    id,
    isOpening: true as const,
    // Named, not numbered: an opening balance has no invoice/bill number of
    // its own, and borrowing the old system's reference where there is one
    // is what makes it findable in the previous books.
    reference: referenceNumber || 'Opening Balance',
    date: referenceDate,
    dueDate: referenceDate,
    totalAmount: round2(amount),
    paidAmount: 0,
    outstandingAmount: round2(amount),
  };
}

export const partyOutstandingService = {
  /** Customer-wise receivables: opening + unpaid invoices. */
  async customerRows(range: DateRange = {}): Promise<PartyOutstandingRow[]> {
    const today = new Date();
    const [opening, invoices] = await Promise.all([
      openingBalanceService.openingReceivables(),
      prisma.invoice.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'PAID'] },
          outstandingAmount: { gt: 0 },
          ...rangeWhere('invoiceDate', range),
        },
        select: { companyId: true, dueDate: true, outstandingAmount: true, company: { select: { name: true } } },
      }),
    ]);

    const rows = new Map<string, PartyOutstandingRow>();

    for (const inv of invoices) {
      const row = rows.get(inv.companyId) ?? blankRow(inv.companyId, inv.company.name);
      const amount = Number(inv.outstandingAmount);
      row.current += amount;
      addAmount(row, amount, inv.dueDate, today);
      rows.set(inv.companyId, row);
    }

    for (const entry of opening.rows) {
      if (!entry.companyId) continue;
      if (!openingRowInRange(entry.referenceDate, range)) continue;
      const row = rows.get(entry.companyId) ?? blankRow(entry.companyId, entry.company?.name ?? 'Unknown');
      const amount = Number(entry.amount);
      row.opening += amount;
      addAmount(row, amount, entry.referenceDate, today);
      rows.set(entry.companyId, row);
    }

    return finalizeRows(rows);
  },

  /** Supplier-wise payables: opening + unpaid bills. */
  async supplierRows(range: DateRange = {}): Promise<PartyOutstandingRow[]> {
    const today = new Date();
    const [opening, bills] = await Promise.all([
      openingBalanceService.openingPayables(),
      prisma.supplierBill.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'PAID'] },
          outstandingAmount: { gt: 0 },
          ...rangeWhere('billDate', range),
        },
        select: { supplierId: true, dueDate: true, outstandingAmount: true, supplier: { select: { name: true } } },
      }),
    ]);

    const rows = new Map<string, PartyOutstandingRow>();

    for (const bill of bills) {
      const row = rows.get(bill.supplierId) ?? blankRow(bill.supplierId, bill.supplier.name);
      const amount = Number(bill.outstandingAmount);
      row.current += amount;
      addAmount(row, amount, bill.dueDate, today);
      rows.set(bill.supplierId, row);
    }

    for (const entry of opening.rows) {
      if (!entry.supplierId) continue;
      if (!openingRowInRange(entry.referenceDate, range)) continue;
      const row = rows.get(entry.supplierId) ?? blankRow(entry.supplierId, entry.supplier?.name ?? 'Unknown');
      const amount = Number(entry.amount);
      row.opening += amount;
      addAmount(row, amount, entry.referenceDate, today);
      rows.set(entry.supplierId, row);
    }

    return finalizeRows(rows);
  },

  async customerTotals(range: DateRange = {}): Promise<PartyOutstandingTotals> {
    return totalsOf(await partyOutstandingService.customerRows(range));
  },

  async supplierTotals(range: DateRange = {}): Promise<PartyOutstandingTotals> {
    return totalsOf(await partyOutstandingService.supplierRows(range));
  },

  /** What one customer owes, opening included — used by credit control. */
  async customerTotal(companyId: string): Promise<PartyOutstandingTotals> {
    const [invoiceAgg, opening] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId, deletedAt: null, status: { notIn: ['CANCELLED'] } },
        _sum: { outstandingAmount: true },
      }),
      openingBalanceService.openingReceivables(),
    ]);
    const current = Number(invoiceAgg._sum.outstandingAmount || 0);
    const openingAmount = opening.byCompany.get(companyId)?.amount ?? 0;
    return { opening: round2(openingAmount), current: round2(current), total: round2(current + openingAmount) };
  },

  /** What we owe one supplier, opening included. */
  async supplierTotal(supplierId: string): Promise<PartyOutstandingTotals> {
    const [billAgg, opening] = await Promise.all([
      prisma.supplierBill.aggregate({
        where: { supplierId, deletedAt: null, status: { notIn: ['CANCELLED'] } },
        _sum: { outstandingAmount: true },
      }),
      openingBalanceService.openingPayables(),
    ]);
    const current = Number(billAgg._sum.outstandingAmount || 0);
    const openingAmount = opening.bySupplier.get(supplierId)?.amount ?? 0;
    return { opening: round2(openingAmount), current: round2(current), total: round2(current + openingAmount) };
  },

  async customerOpeningLines(companyId: string) {
    const opening = await openingBalanceService.openingReceivables();
    return opening.rows
      .filter((r) => r.companyId === companyId)
      .map((r) => openingLine(r.id, r.referenceNumber, r.referenceDate, Number(r.amount)));
  },

  async supplierOpeningLines(supplierId: string) {
    const opening = await openingBalanceService.openingPayables();
    return opening.rows
      .filter((r) => r.supplierId === supplierId)
      .map((r) => openingLine(r.id, r.referenceNumber, r.referenceDate, Number(r.amount)));
  },
};
