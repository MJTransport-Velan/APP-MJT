import { prisma } from '../config/db';
import { auditService } from './audit.service';
import { DateRange, hasRange, rangeWhere, resolveRange, currentMonthRange, startOfMonthsAgo, startOfDaysAgo } from '../utils/dateRange';
import { buildDateBuckets, zeroSeries, seriesValues } from '../utils/dateBuckets';

const PENDING_STATUSES = ['DRAFT', 'PLANNED', 'APPROVED', 'ASSIGNED'] as const;
const RUNNING_STATUSES = ['STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING'] as const;

function tripStatusLabel(status: string): string {
  if (status === 'COMPLETED') return 'Completed';
  if ((RUNNING_STATUSES as readonly string[]).includes(status)) return 'Running';
  if ((PENDING_STATUSES as readonly string[]).includes(status)) return 'Pending';
  return status === 'CANCELLED' ? 'Cancelled' : status;
}

export const dashboardService = {
  /**
   * @param range From/To window picked on the dashboard. Trip counts, money
   * figures, both charts and the recent lists are all scoped to it. With no
   * range the screen keeps its previous behaviour: all-time trip counts,
   * this month's money, a six-month revenue chart and a seven-day trip chart.
   */
  async getSummary(range: DateRange = {}) {
    const filtered = hasRange(range);
    const now = new Date();

    // Money tiles: the picked window, else this month — the figure the
    // cards were labelled with before a filter existed.
    const moneyRange = resolveRange(range, currentMonthRange);
    const moneyWhere = (field: string) => rangeWhere(field, moneyRange);

    // Charts: the picked window, else the six months / seven days each
    // chart has always shown.
    const revenueChartRange = filtered ? moneyRange : { from: startOfMonthsAgo(5), to: now };
    const tripChartRange = filtered ? moneyRange : { from: startOfDaysAgo(6), to: now };

    const revenueBuckets = buildDateBuckets(revenueChartRange);
    const tripBuckets = buildDateBuckets(tripChartRange);

    // Trip counts are a backlog view when unfiltered (how many trips are
    // pending right now); once a window is picked they become "trips
    // raised in this period".
    const tripCountWhere = filtered ? rangeWhere('createdAt', moneyRange) : {};

    const [
      totalTrips,
      pendingTrips,
      runningTrips,
      completedTrips,
      periodReceipts,
      periodTripExpenses,
      periodSupplierPayments,
      receiptsForChart,
      tripExpensesForChart,
      supplierPaymentsForChart,
      tripsForChart,
      recentTripsRaw,
      recentActivities,
    ] = await Promise.all([
      prisma.trip.count({ where: { deletedAt: null, ...tripCountWhere } }),
      prisma.trip.count({ where: { deletedAt: null, status: { in: [...PENDING_STATUSES] }, ...tripCountWhere } }),
      prisma.trip.count({ where: { deletedAt: null, status: { in: [...RUNNING_STATUSES] }, ...tripCountWhere } }),
      prisma.trip.count({ where: { deletedAt: null, status: 'COMPLETED', ...tripCountWhere } }),
      prisma.receipt.aggregate({ where: { deletedAt: null, ...moneyWhere('receiptDate') }, _sum: { amount: true } }),
      prisma.tripExpense.aggregate({ where: { deletedAt: null, ...moneyWhere('expenseDate') }, _sum: { amount: true } }),
      prisma.supplierPayment.aggregate({ where: { deletedAt: null, ...moneyWhere('paymentDate') }, _sum: { amount: true } }),
      prisma.receipt.findMany({ where: { deletedAt: null, ...rangeWhere('receiptDate', revenueChartRange) }, select: { amount: true, receiptDate: true } }),
      prisma.tripExpense.findMany({ where: { deletedAt: null, ...rangeWhere('expenseDate', revenueChartRange) }, select: { amount: true, expenseDate: true } }),
      prisma.supplierPayment.findMany({ where: { deletedAt: null, ...rangeWhere('paymentDate', revenueChartRange) }, select: { amount: true, paymentDate: true } }),
      prisma.trip.findMany({ where: { deletedAt: null, ...rangeWhere('createdAt', tripChartRange) }, select: { createdAt: true } }),
      prisma.trip.findMany({
        where: { deletedAt: null, ...tripCountWhere },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          tripNumber: true,
          status: true,
          freightAmount: true,
          fromLocation: { select: { name: true } },
          toLocation: { select: { name: true } },
          driver: { select: { name: true } },
          marketDriverName: true,
        },
      }),
      auditService.recentActivity(6, filtered ? moneyRange : undefined),
    ]);

    const periodRevenue = Number(periodReceipts._sum.amount || 0);
    const periodExpenses = Number(periodTripExpenses._sum.amount || 0) + Number(periodSupplierPayments._sum.amount || 0);

    // Bucketed in JS — the dataset is small enough (single-company ERP)
    // that a raw-SQL group-by isn't needed.
    const revenueTotals = zeroSeries(revenueBuckets);
    for (const r of receiptsForChart) {
      const key = revenueBuckets.keyOf(r.receiptDate);
      if (key) revenueTotals.set(key, revenueTotals.get(key)! + Number(r.amount));
    }
    const expenseTotals = zeroSeries(revenueBuckets);
    for (const e of tripExpensesForChart) {
      const key = revenueBuckets.keyOf(e.expenseDate);
      if (key) expenseTotals.set(key, expenseTotals.get(key)! + Number(e.amount));
    }
    for (const p of supplierPaymentsForChart) {
      const key = revenueBuckets.keyOf(p.paymentDate);
      if (key) expenseTotals.set(key, expenseTotals.get(key)! + Number(p.amount));
    }

    const tripTotals = zeroSeries(tripBuckets);
    for (const t of tripsForChart) {
      const key = tripBuckets.keyOf(t.createdAt);
      if (key) tripTotals.set(key, tripTotals.get(key)! + 1);
    }

    return {
      period: { from: moneyRange.from, to: moneyRange.to, filtered },
      cards: {
        totalTrips,
        pendingTrips,
        runningTrips,
        completedTrips,
        revenue: periodRevenue,
        expenses: periodExpenses,
        profit: periodRevenue - periodExpenses,
      },
      revenueChart: {
        categories: revenueBuckets.labels,
        revenue: seriesValues(revenueBuckets, revenueTotals),
        expenses: seriesValues(revenueBuckets, expenseTotals),
      },
      tripChart: {
        categories: tripBuckets.labels,
        trips: seriesValues(tripBuckets, tripTotals),
      },
      recentTrips: recentTripsRaw.map((t) => ({
        id: t.tripNumber,
        route: `${t.fromLocation.name} -> ${t.toLocation.name}`,
        driver: t.driver?.name || t.marketDriverName || '-',
        status: tripStatusLabel(t.status),
        amount: Number(t.freightAmount || 0),
      })),
      recentActivities,
    };
  },
};
