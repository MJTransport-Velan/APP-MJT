import { prisma } from '../config/db';
import { ReportFilters, dateRangeWhere } from '../utils/reportFilters';
import { ReportDefinition } from '../reports/report.types';

const companyWiseReport: ReportDefinition = {
  key: 'companyWiseReport',
  label: 'Company-wise Report',
  columns: [
    { key: 'companyName', label: 'Company' },
    { key: 'intentCount', label: 'Intents' },
    { key: 'tripCount', label: 'Trips' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'outstanding', label: 'Outstanding' },
  ],
  run: async (filters) => {
    const companies = await prisma.company.findMany({
      where: { deletedAt: null, ...(filters.companyId ? { id: filters.companyId } : {}) },
    });

    const rows = await Promise.all(
      companies.map(async (company) => {
        const [intentCount, trips, outstandingAgg] = await Promise.all([
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
          prisma.invoice.aggregate({
            where: { deletedAt: null, companyId: company.id, status: { notIn: ['CANCELLED'] } },
            _sum: { outstandingAmount: true },
          }),
        ]);

        return {
          companyName: company.name,
          intentCount,
          tripCount: trips.length,
          revenue: trips.reduce((sum, t) => sum + Number(t.freightAmount || 0), 0),
          outstanding: Number(outstandingAgg._sum.outstandingAmount || 0),
        };
      })
    );

    return { rows: rows.filter((r) => r.intentCount > 0 || r.tripCount > 0 || r.outstanding > 0), total: rows.length };
  },
};

// Branches aren't linked to Trip/Intent in the schema (they sit under
// Company as organizational master data only), so this reports on branch
// master records grouped by company rather than branch-level trip
// metrics — extending Trip/Intent with a branchId FK is a data-model
// change outside this reports-only phase.
const branchWiseReport: ReportDefinition = {
  key: 'branchWiseReport',
  label: 'Branch-wise Report',
  columns: [
    { key: 'branchName', label: 'Branch' },
    { key: 'company', label: 'Company' },
    { key: 'isActive', label: 'Active' },
    { key: 'createdAt', label: 'Created' },
  ],
  run: async (filters, skip, take) => {
    const where = {
      deletedAt: null,
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.branchId ? { id: filters.branchId } : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.branch.findMany({ where, include: { company: true }, orderBy: { name: 'asc' }, skip, take }),
      prisma.branch.count({ where }),
    ]);
    return {
      rows: rows.map((b) => ({
        branchName: b.name,
        company: b.company.name,
        isActive: b.isActive,
        createdAt: b.createdAt,
      })),
      total,
    };
  },
};

const routeWiseReport: ReportDefinition = {
  key: 'routeWiseReport',
  label: 'Route-wise Report',
  columns: [
    { key: 'route', label: 'Route' },
    { key: 'tripCount', label: 'Trips' },
    { key: 'totalRevenue', label: 'Revenue' },
    { key: 'avgFreight', label: 'Avg Freight' },
  ],
  run: async (filters) => {
    const trips = await prisma.trip.findMany({
      where: {
        deletedAt: null,
        status: 'COMPLETED',
        ...(filters.routeId ? { routeId: filters.routeId } : {}),
        ...dateRangeWhere('actualEndDate', filters),
      },
      include: { route: true, fromLocation: true, toLocation: true },
    });

    const grouped = new Map<string, { route: string; tripCount: number; totalRevenue: number }>();
    for (const trip of trips) {
      const key = trip.route?.id || `${trip.fromLocationId}-${trip.toLocationId}`;
      const label = trip.route?.name || `${trip.fromLocation.name} -> ${trip.toLocation.name}`;
      const existing = grouped.get(key) || { route: label, tripCount: 0, totalRevenue: 0 };
      existing.tripCount += 1;
      existing.totalRevenue += Number(trip.freightAmount || 0);
      grouped.set(key, existing);
    }

    const rows = Array.from(grouped.values()).map((r) => ({
      ...r,
      avgFreight: r.tripCount > 0 ? Number((r.totalRevenue / r.tripCount).toFixed(2)) : 0,
    }));
    return { rows, total: rows.length };
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
  branchWiseReport,
  routeWiseReport,
  monthlyBusinessSummaryReport,
  yearlyBusinessSummaryReport,
  kpiSummaryReport,
};
