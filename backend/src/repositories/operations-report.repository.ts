import { Prisma, TripStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { ReportFilters, dateRangeWhere } from '../utils/reportFilters';
import { ReportDefinition } from '../reports/report.types';

function tripWhere(filters: ReportFilters, extra: Prisma.TripWhereInput = {}): Prisma.TripWhereInput {
  return {
    deletedAt: null,
    ...extra,
    AND: [
      filters.search ? { tripNumber: { contains: filters.search, mode: 'insensitive' } } : {},
      filters.companyId ? { intent: { companyId: filters.companyId } } : {},
      filters.supplierId ? { supplierId: filters.supplierId } : {},
      filters.vehicleId ? { vehicleId: filters.vehicleId } : {},
      filters.driverId ? { driverId: filters.driverId } : {},
      filters.routeId ? { routeId: filters.routeId } : {},
      dateRangeWhere('createdAt', filters),
    ],
  };
}

const tripInclude = {
  intent: { include: { company: true } },
  vehicle: true,
  driver: true,
  supplier: true,
  route: true,
  fromLocation: true,
  toLocation: true,
} satisfies Prisma.TripInclude;

function serializeTrip(trip: Prisma.TripGetPayload<{ include: typeof tripInclude }>) {
  return {
    tripNumber: trip.tripNumber,
    status: trip.status,
    company: trip.intent.company.name,
    vehicle: trip.vehicle?.registrationNumber || '-',
    driver: trip.driver?.name || '-',
    supplier: trip.supplier?.name || '-',
    route: trip.route?.name || `${trip.fromLocation.name} -> ${trip.toLocation.name}`,
    freightAmount: trip.freightAmount,
    supplierRate: trip.supplierRate,
    scheduledStartDate: trip.scheduledStartDate,
    actualStartDate: trip.actualStartDate,
    actualEndDate: trip.actualEndDate,
    cancelReason: trip.cancelReason,
  };
}

const tripReport: ReportDefinition = {
  key: 'tripReport',
  label: 'Trip Report',
  columns: [
    { key: 'tripNumber', label: 'Trip No.' },
    { key: 'status', label: 'Status' },
    { key: 'company', label: 'Company' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'driver', label: 'Driver' },
    { key: 'route', label: 'Route' },
    { key: 'freightAmount', label: 'Freight' },
    { key: 'scheduledStartDate', label: 'Scheduled Start' },
  ],
  run: async (filters, skip, take) => {
    const where = tripWhere(filters, filters.tripStatus ? { status: filters.tripStatus as TripStatus } : {});
    const [rows, total] = await prisma.$transaction([
      prisma.trip.findMany({ where, include: tripInclude, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.trip.count({ where }),
    ]);
    return { rows: rows.map(serializeTrip), total };
  },
};

const completedTripReport: ReportDefinition = {
  ...tripReport,
  key: 'completedTripReport',
  label: 'Completed Trip Report',
  run: async (filters, skip, take) => {
    const where = tripWhere(filters, { status: 'COMPLETED' });
    const [rows, total] = await prisma.$transaction([
      prisma.trip.findMany({ where, include: tripInclude, orderBy: { actualEndDate: 'desc' }, skip, take }),
      prisma.trip.count({ where }),
    ]);
    return { rows: rows.map(serializeTrip), total };
  },
};

const cancelledTripReport: ReportDefinition = {
  key: 'cancelledTripReport',
  label: 'Cancelled Trip Report',
  columns: [...tripReport.columns, { key: 'cancelReason', label: 'Cancel Reason' }],
  run: async (filters, skip, take) => {
    const where = tripWhere(filters, { status: 'CANCELLED' });
    const [rows, total] = await prisma.$transaction([
      prisma.trip.findMany({ where, include: tripInclude, orderBy: { updatedAt: 'desc' }, skip, take }),
      prisma.trip.count({ where }),
    ]);
    return { rows: rows.map(serializeTrip), total };
  },
};

const supplierTripReport: ReportDefinition = {
  key: 'supplierTripReport',
  label: 'Supplier Trip Report',
  columns: [...tripReport.columns, { key: 'supplierRate', label: 'Supplier Rate' }],
  run: async (filters, skip, take) => {
    const where = tripWhere(filters, { supplierId: { not: null } });
    const [rows, total] = await prisma.$transaction([
      prisma.trip.findMany({ where, include: tripInclude, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.trip.count({ where }),
    ]);
    return { rows: rows.map(serializeTrip), total };
  },
};

const customerTripReport: ReportDefinition = {
  ...tripReport,
  key: 'customerTripReport',
  label: 'Customer Trip Report',
};

const pendingIntentReport: ReportDefinition = {
  key: 'pendingIntentReport',
  label: 'Pending Intent Report',
  columns: [
    { key: 'intentNumber', label: 'Intent No.' },
    { key: 'company', label: 'Company' },
    { key: 'route', label: 'Route' },
    { key: 'freightAmount', label: 'Freight' },
    { key: 'expectedPickupDate', label: 'Expected Pickup' },
    { key: 'createdAt', label: 'Created' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.IntentWhereInput = {
      deletedAt: null,
      status: 'SUBMITTED',
      AND: [
        filters.search ? { intentNumber: { contains: filters.search, mode: 'insensitive' } } : {},
        filters.companyId ? { companyId: filters.companyId } : {},
        dateRangeWhere('createdAt', filters),
      ],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.intent.findMany({
        where,
        include: { company: true, fromLocation: true, toLocation: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.intent.count({ where }),
    ]);
    return {
      rows: rows.map((i) => ({
        intentNumber: i.intentNumber,
        company: i.company.name,
        route: `${i.fromLocation.name} -> ${i.toLocation.name}`,
        freightAmount: i.freightAmount,
        expectedPickupDate: i.expectedPickupDate,
        createdAt: i.createdAt,
      })),
      total,
    };
  },
};

const vehicleUtilizationReport: ReportDefinition = {
  key: 'vehicleUtilizationReport',
  label: 'Vehicle Utilization Report',
  columns: [
    { key: 'registrationNumber', label: 'Vehicle' },
    { key: 'status', label: 'Current Status' },
    { key: 'tripCount', label: 'Trips' },
    { key: 'totalRevenue', label: 'Revenue' },
    { key: 'totalDistanceKm', label: 'Distance (km)' },
  ],
  run: async (filters) => {
    const tripWhereClause: Prisma.TripWhereInput = {
      deletedAt: null,
      vehicleId: filters.vehicleId ? filters.vehicleId : { not: null },
      ...dateRangeWhere('createdAt', filters),
    };
    const trips = await prisma.trip.findMany({
      where: tripWhereClause,
      select: { vehicleId: true, freightAmount: true, vehicle: true },
    });

    const fuelWhereClause: Prisma.FuelEntryWhereInput = {
      deletedAt: null,
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...dateRangeWhere('entryDate', filters),
    };
    const fuelEntries = await prisma.fuelEntry.findMany({
      where: fuelWhereClause,
      select: { vehicleId: true, distanceCovered: true },
    });

    const grouped = new Map<string, { registrationNumber: string; status: string; tripCount: number; totalRevenue: number; totalDistanceKm: number }>();
    for (const trip of trips) {
      if (!trip.vehicleId || !trip.vehicle) continue;
      const existing = grouped.get(trip.vehicleId) || {
        registrationNumber: trip.vehicle.registrationNumber,
        status: trip.vehicle.status,
        tripCount: 0,
        totalRevenue: 0,
        totalDistanceKm: 0,
      };
      existing.tripCount += 1;
      existing.totalRevenue += Number(trip.freightAmount || 0);
      grouped.set(trip.vehicleId, existing);
    }
    for (const entry of fuelEntries) {
      const existing = grouped.get(entry.vehicleId);
      if (existing) existing.totalDistanceKm += entry.distanceCovered || 0;
    }

    const rows = Array.from(grouped.values());
    return { rows, total: rows.length };
  },
};

const driverPerformanceReport: ReportDefinition = {
  key: 'driverPerformanceReport',
  label: 'Driver Performance Report',
  columns: [
    { key: 'driverName', label: 'Driver' },
    { key: 'totalTrips', label: 'Total Trips' },
    { key: 'completedTrips', label: 'Completed' },
    { key: 'cancelledTrips', label: 'Cancelled' },
    { key: 'totalRevenue', label: 'Revenue' },
  ],
  run: async (filters) => {
    const where: Prisma.TripWhereInput = {
      deletedAt: null,
      driverId: filters.driverId ? filters.driverId : { not: null },
      ...dateRangeWhere('createdAt', filters),
    };
    const trips = await prisma.trip.findMany({
      where,
      select: { driverId: true, status: true, freightAmount: true, driver: true },
    });

    const grouped = new Map<string, { driverName: string; totalTrips: number; completedTrips: number; cancelledTrips: number; totalRevenue: number }>();
    for (const trip of trips) {
      if (!trip.driverId || !trip.driver) continue;
      const existing = grouped.get(trip.driverId) || {
        driverName: trip.driver.name,
        totalTrips: 0,
        completedTrips: 0,
        cancelledTrips: 0,
        totalRevenue: 0,
      };
      existing.totalTrips += 1;
      if (trip.status === 'COMPLETED') {
        existing.completedTrips += 1;
        existing.totalRevenue += Number(trip.freightAmount || 0);
      }
      if (trip.status === 'CANCELLED') existing.cancelledTrips += 1;
      grouped.set(trip.driverId, existing);
    }

    const rows = Array.from(grouped.values());
    return { rows, total: rows.length };
  },
};

export const operationsReportRepository: Record<string, ReportDefinition> = {
  tripReport,
  pendingIntentReport,
  completedTripReport,
  cancelledTripReport,
  vehicleUtilizationReport,
  driverPerformanceReport,
  supplierTripReport,
  customerTripReport,
};
