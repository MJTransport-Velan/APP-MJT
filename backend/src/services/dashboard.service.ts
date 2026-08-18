import { prisma } from '../config/db';
import { auditService } from './audit.service';

const PENDING_STATUSES = ['DRAFT', 'PLANNED', 'APPROVED', 'ASSIGNED'] as const;
const RUNNING_STATUSES = ['STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING'] as const;

function tripStatusLabel(status: string): string {
  if (status === 'COMPLETED') return 'Completed';
  if ((RUNNING_STATUSES as readonly string[]).includes(status)) return 'Running';
  if ((PENDING_STATUSES as readonly string[]).includes(status)) return 'Pending';
  return status === 'CANCELLED' ? 'Cancelled' : status;
}

export const dashboardService = {
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    const [
      totalTrips,
      pendingTrips,
      runningTrips,
      completedTrips,
      monthlyReceipts,
      monthlyTripExpenses,
      monthlySupplierPayments,
      receiptsForChart,
      tripExpensesForChart,
      supplierPaymentsForChart,
      tripsForWeekChart,
      recentTripsRaw,
      recentActivities,
    ] = await Promise.all([
      prisma.trip.count({ where: { deletedAt: null } }),
      prisma.trip.count({ where: { deletedAt: null, status: { in: [...PENDING_STATUSES] } } }),
      prisma.trip.count({ where: { deletedAt: null, status: { in: [...RUNNING_STATUSES] } } }),
      prisma.trip.count({ where: { deletedAt: null, status: 'COMPLETED' } }),
      prisma.receipt.aggregate({ where: { deletedAt: null, receiptDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.tripExpense.aggregate({ where: { deletedAt: null, expenseDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.supplierPayment.aggregate({ where: { deletedAt: null, paymentDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.receipt.findMany({ where: { deletedAt: null, receiptDate: { gte: sixMonthsAgo } }, select: { amount: true, receiptDate: true } }),
      prisma.tripExpense.findMany({ where: { deletedAt: null, expenseDate: { gte: sixMonthsAgo } }, select: { amount: true, expenseDate: true } }),
      prisma.supplierPayment.findMany({ where: { deletedAt: null, paymentDate: { gte: sixMonthsAgo } }, select: { amount: true, paymentDate: true } }),
      prisma.trip.findMany({ where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
      prisma.trip.findMany({
        where: { deletedAt: null },
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
      auditService.recentActivity(6),
    ]);

    const monthlyRevenue = Number(monthlyReceipts._sum.amount || 0);
    const monthlyExpenses = Number(monthlyTripExpenses._sum.amount || 0) + Number(monthlySupplierPayments._sum.amount || 0);

    // Last 6 calendar months (oldest first), bucketed in JS — dataset is
    // small enough (single-company ERP) that a raw-SQL group-by isn't needed.
    const monthKeys: string[] = [];
    const monthLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
      monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    }
    const revenueByMonth = new Map(monthKeys.map((k) => [k, 0]));
    for (const r of receiptsForChart) {
      const d = new Date(r.receiptDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (revenueByMonth.has(key)) revenueByMonth.set(key, revenueByMonth.get(key)! + Number(r.amount));
    }
    const expensesByMonth = new Map(monthKeys.map((k) => [k, 0]));
    for (const e of tripExpensesForChart) {
      const d = new Date(e.expenseDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (expensesByMonth.has(key)) expensesByMonth.set(key, expensesByMonth.get(key)! + Number(e.amount));
    }
    for (const p of supplierPaymentsForChart) {
      const d = new Date(p.paymentDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (expensesByMonth.has(key)) expensesByMonth.set(key, expensesByMonth.get(key)! + Number(p.amount));
    }

    // Last 7 calendar days (oldest first) — trips recorded (createdAt) each day.
    const dayKeys: string[] = [];
    const dayLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dayKeys.push(d.toDateString());
      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    const tripsByDay = new Map(dayKeys.map((k) => [k, 0]));
    for (const t of tripsForWeekChart) {
      const key = new Date(t.createdAt).toDateString();
      if (tripsByDay.has(key)) tripsByDay.set(key, tripsByDay.get(key)! + 1);
    }

    return {
      cards: {
        totalTrips,
        pendingTrips,
        runningTrips,
        completedTrips,
        revenue: monthlyRevenue,
        expenses: monthlyExpenses,
        profit: monthlyRevenue - monthlyExpenses,
      },
      revenueChart: {
        categories: monthLabels,
        revenue: monthKeys.map((k) => Math.round(revenueByMonth.get(k)!)),
        expenses: monthKeys.map((k) => Math.round(expensesByMonth.get(k)!)),
      },
      tripChart: {
        categories: dayLabels,
        trips: dayKeys.map((k) => tripsByDay.get(k)!),
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
