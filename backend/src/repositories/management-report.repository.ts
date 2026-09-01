import { prisma } from '../config/db';
import { ReportFilters, dateRangeWhere, toDateRange } from '../utils/reportFilters';
import { hasRange } from '../utils/dateRange';
import { partyOutstandingService } from '../services/party-outstanding.service';
import { ReportDefinition } from '../reports/report.types';

const companyWiseReport: ReportDefinition = {
  key: 'companyWiseReport',
  label: 'Company-wise Report',
  columns: [
    { key: 'companyName', label: 'Company' },
    { key: 'intentCount', label: 'Intents' },
    { key: 'tripCount', label: 'Trips' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'opening', label: 'Opening' },
    { key: 'outstanding', label: 'Outstanding' },
  ],
  run: async (filters) => {
    const companies = await prisma.company.findMany({
      where: { deletedAt: null, ...(filters.companyId ? { id: filters.companyId } : {}) },
    });

    // Outstanding here has to match every other outstanding figure in the
    // app, which means counting the opening balance carried over from the
    // previous system alongside the unpaid invoices.
    const outstandingByCompany = new Map(
      (await partyOutstandingService.customerRows()).map((r) => [r.partyId, r])
    );

    const rows = await Promise.all(
      companies.map(async (company) => {
        const [intentCount, trips] = await Promise.all([
          prisma.intent.count({ where: { deletedAt: null, companyId: company.id, ...dateRangeWhere('createdAt', filters) } }),
          prisma.trip.findMany({
            where: {
              deletedAt: null,
              status: 'COMPLETED',
              intent: { companyId: company.id },
              ...dateRangeWhere('actualEndDate', filters),
            },
            select: { freightAmount: true },
          }),
        ]);

        return {
          companyName: company.name,
          intentCount,
          tripCount: trips.length,
          revenue: trips.reduce((sum, t) => sum + Number(t.freightAmount || 0), 0),
          opening: outstandingByCompany.get(company.id)?.opening ?? 0,
          outstanding: outstandingByCompany.get(company.id)?.total ?? 0,
        };
      })
    );

    return { rows: rows.filter((r) => r.intentCount > 0 || r.tripCount > 0 || r.outstanding > 0), total: rows.length };
  },
};

async function computePeriodSummary(from: Date, to: Date) {
  const [intentCount, trips, tripExpenseAgg, supplierPaymentAgg] = await Promise.all([
    prisma.intent.count({ where: { deletedAt: null, createdAt: { gte: from, lte: to } } }),
    prisma.trip.findMany({
      where: { deletedAt: null, status: 'COMPLETED', actualEndDate: { gte: from, lte: to } },
      select: { freightAmount: true },
    }),
    prisma.tripExpense.aggregate({
      where: { deletedAt: null, expenseDate: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.supplierPayment.aggregate({
      where: { deletedAt: null, paymentDate: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
  ]);

  const revenue = trips.reduce((sum, t) => sum + Number(t.freightAmount || 0), 0);
  const expenses = Number(tripExpenseAgg._sum.amount || 0) + Number(supplierPaymentAgg._sum.amount || 0);

  return {
    intentCount,
    tripCount: trips.length,
    revenue,
    expenses,
    profit: revenue - expenses,
  };
}

/**
 * The month-by-month rows a From/To window covers, oldest first. A window
 * that starts or ends mid-month still yields that whole month's row —
 * these are calendar-month summaries, and a part-month row would not be
 * comparable with the ones either side of it.
 */
function monthsInRange(filters: ReportFilters) {
  const range = toDateRange(filters);
  const first = range.from ?? new Date();
  const last = range.to ?? new Date();
  const months: { from: Date; to: Date }[] = [];
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  const end = new Date(last.getFullYear(), last.getMonth(), 1);
  while (cursor <= end) {
    months.push({
      from: new Date(cursor.getFullYear(), cursor.getMonth(), 1),
      to: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

const monthlyBusinessSummaryReport: ReportDefinition = {
  key: 'monthlyBusinessSummaryReport',
  label: 'Monthly Business Summary',
  columns: [
    { key: 'month', label: 'Month' },
    { key: 'intentCount', label: 'Intents' },
    { key: 'tripCount', label: 'Trips' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'profit', label: 'Profit' },
  ],
  run: async (filters: ReportFilters) => {
    // A From/To window wins over the year/month pair: it is the filter the
    // report toolbar actually offers, and it can span several months, so
    // each month in it gets its own row.
    if (hasRange(toDateRange(filters))) {
      const rows = await Promise.all(
        monthsInRange(filters).map(async (m) => ({
          month: m.from.toISOString().slice(0, 7),
          ...(await computePeriodSummary(m.from, m.to)),
        }))
      );
      return { rows, total: rows.length };
    }

    const now = new Date();
    const year = filters.year || now.getFullYear();
    const month = filters.month || now.getMonth() + 1;
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);

    const summary = await computePeriodSummary(from, to);
    const row = { month: from.toISOString().slice(0, 7), ...summary };
    return { rows: [row], total: 1 };
  },
};

const yearlyBusinessSummaryReport: ReportDefinition = {
  key: 'yearlyBusinessSummaryReport',
  label: 'Yearly Business Summary',
  columns: [
    { key: 'month', label: 'Month' },
    { key: 'intentCount', label: 'Intents' },
    { key: 'tripCount', label: 'Trips' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'profit', label: 'Profit' },
  ],
  run: async (filters: ReportFilters) => {
    if (hasRange(toDateRange(filters))) {
      const rows = await Promise.all(
        monthsInRange(filters).map(async (m) => ({
          month: m.from.toISOString().slice(0, 7),
          ...(await computePeriodSummary(m.from, m.to)),
        }))
      );
      return { rows, total: rows.length };
    }

    const year = filters.year || new Date().getFullYear();
    const rows = [];
    for (let m = 0; m < 12; m++) {
      const from = new Date(year, m, 1);
      const to = new Date(year, m + 1, 0, 23, 59, 59);
      const summary = await computePeriodSummary(from, to);
      rows.push({ month: from.toISOString().slice(0, 7), ...summary });
    }
    return { rows, total: rows.length };
  },
};

const kpiSummaryReport: ReportDefinition = {
  key: 'kpiSummaryReport',
  label: 'KPI Summary',
  columns: [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ],
  run: async (filters: ReportFilters) => {
    const dateWhere = dateRangeWhere('actualEndDate', filters);
    const [
      totalVehicles,
      activeVehicles,
      totalTrips,
      completedTrips,
      cancelledTrips,
      completedTripRows,
      outstandingReceivables,
      outstandingPayableTrips,
      supplierPaymentSum,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { deletedAt: null } }),
      prisma.vehicle.count({ where: { deletedAt: null, isActive: true, status: { in: ['AVAILABLE', 'RUNNING'] } } }),
      prisma.trip.count({ where: { deletedAt: null, ...dateRangeWhere('createdAt', filters) } }),
      prisma.trip.count({ where: { deletedAt: null, status: 'COMPLETED', ...dateWhere } }),
      prisma.trip.count({ where: { deletedAt: null, status: 'CANCELLED', ...dateRangeWhere('updatedAt', filters) } }),
      prisma.trip.findMany({
        where: { deletedAt: null, status: 'COMPLETED', ...dateWhere },
        select: { freightAmount: true, expectedDeliveryDate: true, actualEndDate: true },
      }),
      prisma.invoice.aggregate({
        where: { deletedAt: null, status: { notIn: ['CANCELLED'] } },
        _sum: { outstandingAmount: true },
      }),
      prisma.trip.findMany({
        where: { deletedAt: null, status: 'COMPLETED', supplierId: { not: null } },
        select: { supplierRate: true },
      }),
      prisma.supplierPayment.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
    ]);

    const totalRevenue = completedTripRows.reduce((sum, t) => sum + Number(t.freightAmount || 0), 0);
    const onTimeCount = completedTripRows.filter(
      (t) => !t.expectedDeliveryDate || !t.actualEndDate || new Date(t.actualEndDate) <= new Date(t.expectedDeliveryDate)
    ).length;
    const onTimePercent = completedTripRows.length > 0 ? Number(((onTimeCount / completedTripRows.length) * 100).toFixed(1)) : 0;
    const totalSupplierCharges = outstandingPayableTrips.reduce((sum, t) => sum + Number(t.supplierRate || 0), 0);
    const outstandingPayables = totalSupplierCharges - Number(supplierPaymentSum._sum.amount || 0);

    const rows = [
      { metric: 'Total Vehicles', value: totalVehicles },
      { metric: 'Active Vehicles', value: activeVehicles },
      { metric: 'Total Trips', value: totalTrips },
      { metric: 'Completed Trips', value: completedTrips },
      { metric: 'Cancelled Trips', value: cancelledTrips },
      { metric: 'Total Revenue', value: totalRevenue },
      { metric: 'On-Time Delivery %', value: onTimePercent },
      { metric: 'Outstanding Receivables', value: Number(outstandingReceivables._sum.outstandingAmount || 0) },
      { metric: 'Outstanding Payables', value: Math.max(outstandingPayables, 0) },
    ];
    return { rows, total: rows.length };
  },
};

export const managementReportRepository: Record<string, ReportDefinition> = {
  companyWiseReport,
  monthlyBusinessSummaryReport,
  yearlyBusinessSummaryReport,
  kpiSummaryReport,
};
