import { prisma } from '../config/db';
import { balanceSheetService } from './balance-sheet.service';
import { loanDashboardService } from './loan-dashboard.service';
import { profitLossService } from './profit-loss.service';
import { openingBalanceService } from './opening-balance.service';
import { DateRange, hasRange, rangeWhere, resolveRange, currentMonthRange, todayRange } from '../utils/dateRange';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The finance-wide figures (§3) that aren't receivable/payable specific.
 * Both sources are reused rather than re-derived so the dashboard can never
 * disagree with the Balance Sheet or the Loans & EMI screen — showing the
 * same number two different ways is exactly how those screens drift apart.
 */
async function financeOverview() {
  const [bs, loans] = await Promise.all([
    balanceSheetService.get(),
    loanDashboardService.get({} as never),
  ]);

  return {
    cashAvailable: bs.assets.currentAssets.cash,
    bankAvailable: bs.assets.currentAssets.bank,
    totalAssets: bs.totalAssets,
    totalLiabilities: bs.totalLiabilities,
    ownerCapital: bs.equity.ownerCapital,
    // Every owner loan, whether it carries an EMI schedule or was recorded
    // on Capital & Owner Funds.
    ownerLoan: bs.liabilities.ownerLoans,
    loanOutstanding: round2(bs.liabilities.vehicleLoans + bs.liabilities.bankLoans + bs.liabilities.ownerLoans + bs.liabilities.otherLoans),
    pendingEmiCount: loans.stats.pendingEmiCount,
    overdueEmiCount: loans.stats.overdueEmiCount,
    overdueEmiAmount: loans.stats.overdueEmiAmount,
    thisMonthEmi: loans.stats.thisMonthEmi,
    nextEmiDate: loans.stats.nextEmiDate,
    nextEmiAmount: loans.stats.nextEmiAmount,
    upcomingEmis: loans.upcomingEmis.slice(0, 8),
  };
}

/**
 * Folds opening balances into a party-wise outstanding list: a customer who
 * only has an opening balance still belongs on the list, and one who has
 * both gets a single combined figure rather than two rows.
 */
function mergeOpening(
  rows: { id: string; name: string; outstanding: number }[],
  opening: Map<string, { name: string; amount: number }>
) {
  const merged = new Map(rows.map((r) => [r.id, { ...r }]));
  for (const [id, v] of opening.entries()) {
    const existing = merged.get(id);
    if (existing) existing.outstanding = round2(existing.outstanding + v.amount);
    else merged.set(id, { id, name: v.name, outstanding: round2(v.amount) });
  }
  return Array.from(merged.values())
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

/** First and last day of the month `offset` months back from now, as YYYY-MM-DD. */
function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
    label: start.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    from: fmt(start),
    to: fmt(end),
    start,
    end,
  };
}

export const accountsDashboardService = {
  /**
   * Trend data for the dashboard's two charts (spec §3).
   *
   * Revenue vs Expenses reuses profitLossService per month rather than
   * re-deriving the maths, so a bar on this chart always equals what the
   * Profit & Loss screen reports for that same month.
   *
   * There is deliberately NO cash/bank movement series: Bank/Cash balances
   * are a single running figure mutated in place with no dated transaction
   * ledger behind them (see balance-sheet.service.ts), so a historical
   * movement line cannot be reconstructed without inventing it.
   */
  async getTrends(monthsBack = 6, monthsAhead = 6) {
    const pastMonths = Array.from({ length: monthsBack }, (_, i) => monthRange(monthsBack - 1 - i));

    const performance = await Promise.all(
      pastMonths.map(async (m) => {
        const pl = await profitLossService.get({ from: m.from, to: m.to });
        return {
          month: m.key,
          label: m.label,
          revenue: pl.income.total,
          expenses: pl.expenses.total,
          profit: pl.netProfit,
        };
      })
    );

    // EMI falling due over the coming months — the forward-looking half of
    // the picture, straight off the generated schedules.
    const now = new Date();
    const horizonEnd = new Date(now.getFullYear(), now.getMonth() + monthsAhead + 1, 0, 23, 59, 59, 999);
    const installments = await prisma.loanInstallment.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lte: horizonEnd },
        loan: { deletedAt: null, status: 'ACTIVE' },
      },
      select: { dueDate: true, emiAmount: true, principalComponent: true, interestComponent: true },
    });

    const buckets = new Map<string, { label: string; emiAmount: number; principal: number; interest: number; count: number }>();
    for (let i = 0; i < monthsAhead; i++) {
      const m = monthRange(-i);
      buckets.set(m.key, { label: m.label, emiAmount: 0, principal: 0, interest: 0, count: 0 });
    }
    for (const inst of installments) {
      const key = `${inst.dueDate.getFullYear()}-${String(inst.dueDate.getMonth() + 1).padStart(2, '0')}`;
      const b = buckets.get(key);
      // Anything already overdue from before the window is folded into the
      // current month rather than dropped off the chart entirely.
      const target = b ?? buckets.get(monthRange(0).key)!;
      target.emiAmount += Number(inst.emiAmount);
      target.principal += Number(inst.principalComponent);
      target.interest += Number(inst.interestComponent);
      target.count += 1;
    }

    const upcomingEmiByMonth = Array.from(buckets.entries()).map(([month, b]) => ({
      month,
      label: b.label,
      emiAmount: round2(b.emiAmount),
      principal: round2(b.principal),
      interest: round2(b.interest),
      count: b.count,
    }));

    return { monthlyPerformance: performance, upcomingEmiByMonth };
  },

  /**
   * @param range From/To window. Revenue, expenses, profit and the
   * collection/payment tiles are period figures and follow it; so do the
   * recent receipt and payment lists. Outstanding receivables/payables,
   * overdue counts, advance balances, credit-limit alerts and the whole
   * finance overview (balances, loans, EMI) are "where things stand today"
   * figures with no dated movement history behind them, so a past window
   * cannot restate them and they are left whole.
   */
  async getSummary(range: DateRange = {}) {
    const now = new Date();
    const filtered = hasRange(range);
    const period = resolveRange(range, currentMonthRange);
    // "Today's collection / payment" becomes "collection / payment in the
    // selected period" once a window is picked.
    const dayPeriod = filtered ? period : resolveRange({}, todayRange);
    const periodWhere = (field: string) => rangeWhere(field, period);
    const dayWhere = (field: string) => rangeWhere(field, dayPeriod);
    // The recent lists are "the last ten", not a period total — narrowing
    // them by default would blank them outside the current month.
    const recentWhere = (field: string) => (filtered ? rangeWhere(field, period) : {});

    const [
      outstandingReceivables,
      outstandingPayableTrips,
      periodReceipts,
      periodTripExpenses,
      periodSupplierPayments,
      customerOutstanding,
      recentPayments,
      recentReceipts,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { deletedAt: null, status: { notIn: ['CANCELLED'] } },
        _sum: { outstandingAmount: true },
      }),
      prisma.trip.findMany({
        where: { deletedAt: null, status: 'COMPLETED', supplierId: { not: null } },
        select: { id: true, supplierId: true, supplierRate: true },
      }),
      prisma.receipt.aggregate({
        where: { deletedAt: null, ...periodWhere('receiptDate') },
        _sum: { amount: true },
      }),
      prisma.tripExpense.aggregate({
        where: { deletedAt: null, ...periodWhere('expenseDate') },
        _sum: { amount: true },
      }),
      prisma.supplierPayment.aggregate({
        where: { deletedAt: null, ...periodWhere('paymentDate') },
        _sum: { amount: true },
      }),
      prisma.invoice.groupBy({
        by: ['companyId'],
        where: { deletedAt: null, status: { notIn: ['CANCELLED'] }, outstandingAmount: { gt: 0 } },
        _sum: { outstandingAmount: true },
      }),
      prisma.supplierPayment.findMany({
        where: { deletedAt: null, ...recentWhere('paymentDate') },
        include: { supplier: true },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      }),
      prisma.receipt.findMany({
        where: { deletedAt: null, ...recentWhere('receiptDate') },
        include: { company: true },
        orderBy: { receiptDate: 'desc' },
        take: 10,
      }),
    ]);

    // Supplier outstanding = sum(supplierRate for completed trips) - sum(SupplierPayments) per supplier.
    const supplierPaymentSums = await prisma.supplierPayment.groupBy({
      by: ['supplierId'],
      where: { deletedAt: null },
      _sum: { amount: true },
    });
    const paidBySupplier = new Map(supplierPaymentSums.map((s) => [s.supplierId, Number(s._sum.amount || 0)]));

    const chargeBySupplier = new Map<string, number>();
    for (const trip of outstandingPayableTrips) {
      if (!trip.supplierId) continue;
      chargeBySupplier.set(
        trip.supplierId,
        (chargeBySupplier.get(trip.supplierId) || 0) + Number(trip.supplierRate || 0)
      );
    }

    const supplierIds = Array.from(new Set([...chargeBySupplier.keys(), ...paidBySupplier.keys()]));
    const suppliers = await prisma.supplier.findMany({ where: { id: { in: supplierIds } } });
    const supplierNameMap = new Map(suppliers.map((s) => [s.id, s.name]));

    const supplierOutstanding = supplierIds
      .map((id) => ({
        supplierId: id,
        supplierName: supplierNameMap.get(id) || 'Unknown',
        outstanding: (chargeBySupplier.get(id) || 0) - (paidBySupplier.get(id) || 0),
      }))
      .filter((s) => s.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);

    const totalOutstandingPayables = supplierIds.reduce(
      (sum, id) => sum + Math.max((chargeBySupplier.get(id) || 0) - (paidBySupplier.get(id) || 0), 0),
      0
    );

    const companyIds = customerOutstanding.map((c) => c.companyId);
    const companies = await prisma.company.findMany({ where: { id: { in: companyIds } } });
    const companyNameMap = new Map(companies.map((c) => [c.id, c.name]));

    const periodExpensesTotal =
      Number(periodTripExpenses._sum.amount || 0) + Number(periodSupplierPayments._sum.amount || 0);
    const periodRevenue = Number(periodReceipts._sum.amount || 0);

    // Phase 10 — Receivables & Payables additions. All computed live, no stored metric table.
    const [
      supplierBillOutstanding,
      todaysCollection,
      todaysPayment,
      overdueInvoices,
      overdueBills,
      pendingReceiptAllocations,
      advanceReceipts,
      advancePayments,
      blockedOrOverLimitCompanies,
    ] = await Promise.all([
      prisma.supplierBill.aggregate({ where: { deletedAt: null, status: { notIn: ['CANCELLED'] } }, _sum: { outstandingAmount: true } }),
      prisma.receipt.aggregate({ where: { deletedAt: null, ...dayWhere('receiptDate') }, _sum: { amount: true } }),
      prisma.supplierPayment.aggregate({ where: { deletedAt: null, ...dayWhere('paymentDate') }, _sum: { amount: true } }),
      prisma.invoice.count({ where: { deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, dueDate: { lt: now }, outstandingAmount: { gt: 0 } } }),
      prisma.supplierBill.count({ where: { deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, dueDate: { lt: now }, outstandingAmount: { gt: 0 } } }),
      prisma.receipt.count({ where: { deletedAt: null, isAdvance: true } }),
      prisma.receipt.aggregate({ where: { deletedAt: null, isAdvance: true }, _sum: { amount: true } }),
      prisma.supplierPayment.aggregate({ where: { deletedAt: null, isAdvance: true }, _sum: { amount: true } }),
      prisma.company.findMany({
        where: { deletedAt: null, OR: [{ isBlocked: true }, { creditLimit: { not: null } }] },
        select: { id: true, name: true, isBlocked: true, creditLimit: true },
      }),
    ]);

    const creditLimitAlerts = [];
    for (const c of blockedOrOverLimitCompanies) {
      if (c.isBlocked) {
        creditLimitAlerts.push({ companyId: c.id, companyName: c.name, reason: 'BLOCKED' as const, outstanding: null as number | null, limit: c.creditLimit ? Number(c.creditLimit) : null });
        continue;
      }
      if (c.creditLimit) {
        const outstanding = await prisma.invoice.aggregate({
          where: { companyId: c.id, deletedAt: null, status: { notIn: ['CANCELLED'] } },
          _sum: { outstandingAmount: true },
        });
        const total = Number(outstanding._sum.outstandingAmount || 0);
        if (total > Number(c.creditLimit)) {
          creditLimitAlerts.push({ companyId: c.id, companyName: c.name, reason: 'OVER_LIMIT' as const, outstanding: total, limit: Number(c.creditLimit) });
        }
      }
    }

    const overview = await financeOverview();

    // Balances brought over from the old system are still owed / still
    // owing — they belong in these figures, and they are added rather than
    // faked as invoices or bills so they cannot touch revenue or expenses.
    const [openingReceivables, openingPayables] = await Promise.all([
      openingBalanceService.openingReceivables(),
      openingBalanceService.openingPayables(),
    ]);

    return {
      ...overview,
      period: { from: period.from, to: period.to, filtered },
      outstandingReceivables: round2(Number(outstandingReceivables._sum.outstandingAmount || 0) + openingReceivables.total),
      // Now sourced from SupplierBill (Phase 10) where it exists — falls back
      // to the legacy trip-based estimate for suppliers with no bill yet.
      outstandingPayables: round2(
        (Number(supplierBillOutstanding._sum.outstandingAmount || 0) || totalOutstandingPayables) + openingPayables.total
      ),
      openingReceivables: openingReceivables.total,
      openingPayables: openingPayables.total,
      monthlyRevenue: periodRevenue,
      monthlyExpenses: periodExpensesTotal,
      profit: periodRevenue - periodExpensesTotal,
      todaysCollection: Number(todaysCollection._sum.amount || 0),
      todaysPayment: Number(todaysPayment._sum.amount || 0),
      overdueReceivablesCount: overdueInvoices,
      overduePayablesCount: overdueBills,
      pendingCollections: pendingReceiptAllocations,
      pendingPayments: overdueBills,
      advanceBalance: {
        customer: Number(advanceReceipts._sum.amount || 0),
        supplier: Number(advancePayments._sum.amount || 0),
      },
      creditLimitAlerts,
      customerOutstanding: mergeOpening(
        customerOutstanding.map((c) => ({
          id: c.companyId,
          name: companyNameMap.get(c.companyId) || 'Unknown',
          outstanding: Number(c._sum.outstandingAmount || 0),
        })),
        openingReceivables.byCompany
      )
        .map((r) => ({ companyId: r.id, companyName: r.name, outstanding: r.outstanding }))
        .slice(0, 10),
      supplierOutstanding: mergeOpening(
        supplierOutstanding.map((s) => ({ id: s.supplierId, name: s.supplierName, outstanding: s.outstanding })),
        openingPayables.bySupplier
      )
        .map((r) => ({ supplierId: r.id, supplierName: r.name, outstanding: r.outstanding }))
        .slice(0, 10),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        supplier: p.supplier.name,
        amount: p.amount,
        paymentDate: p.paymentDate,
      })),
      recentReceipts: recentReceipts.map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        company: r.company.name,
        amount: r.amount,
        receiptDate: r.receiptDate,
      })),
    };
  },
};
