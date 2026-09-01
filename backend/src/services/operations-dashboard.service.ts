import { prisma } from '../config/db';
import { DateRange, hasRange, rangeWhere, resolveRange, currentMonthRange } from '../utils/dateRange';

export const operationsDashboardService = {
  /**
   * @param range From/To window. Completed-trip and revenue figures are
   * scoped by the date the trip actually ended; intent, planned/running
   * and fleet-mix counts by the date the record was raised. Delayed trips
   * are a live "running late right now" list — a past window cannot
   * narrow it, so it stays unfiltered.
   */
  async getSummary(range: DateRange = {}) {
    const now = new Date();
    const filtered = hasRange(range);
    const period = resolveRange(range, currentMonthRange);

    const completedWhere = rangeWhere('actualEndDate', period);
    // Unfiltered, these tiles answer "what is on my plate right now", which
    // is what the screen showed before a date filter existed.
    const raisedWhere = filtered ? rangeWhere('createdAt', period) : {};

    const [
      pendingIntents,
      approvedIntents,
      tripsPlanned,
      tripsRunning,
      tripsCompleted,
      allNonTerminalTrips,
      supplierTripsCount,
      ownFleetTripsCount,
      periodRevenue,
    ] = await Promise.all([
      prisma.intent.count({ where: { deletedAt: null, status: 'SUBMITTED', ...raisedWhere } }),
      prisma.intent.count({ where: { deletedAt: null, status: 'APPROVED', ...raisedWhere } }),
      prisma.trip.count({ where: { deletedAt: null, status: { in: ['PLANNED', 'APPROVED'] }, ...raisedWhere } }),
      prisma.trip.count({
        where: { deletedAt: null, status: { in: ['STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING'] }, ...raisedWhere },
      }),
      prisma.trip.count({ where: { deletedAt: null, status: 'COMPLETED', ...completedWhere } }),
      prisma.trip.findMany({
        where: { deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED', 'DRAFT'] } },
        select: { id: true, tripNumber: true, expectedDeliveryDate: true, status: true },
      }),
      prisma.trip.count({ where: { deletedAt: null, supplierId: { not: null }, ...raisedWhere } }),
      prisma.trip.count({ where: { deletedAt: null, supplierId: null, vehicleId: { not: null }, ...raisedWhere } }),
      prisma.trip.aggregate({
        where: { deletedAt: null, status: 'COMPLETED', ...completedWhere },
        _sum: { freightAmount: true },
      }),
    ]);

    const tripsDelayed = allNonTerminalTrips.filter(
      (t) => t.expectedDeliveryDate && new Date(t.expectedDeliveryDate) < now
    );

    return {
      period: { from: period.from, to: period.to, filtered },
      intentSummary: {
        pending: pendingIntents,
        approved: approvedIntents,
      },
      tripSummary: {
        planned: tripsPlanned,
        running: tripsRunning,
        completed: tripsCompleted,
        delayed: tripsDelayed.length,
      },
      fleetMixSummary: {
        supplierTrips: supplierTripsCount,
        ownFleetTrips: ownFleetTripsCount,
      },
      revenueSummary: {
        month: period.from.toISOString().slice(0, 7),
        from: period.from,
        to: period.to,
        totalFreightRevenue: periodRevenue._sum.freightAmount || 0,
      },
      delayedTrips: tripsDelayed.slice(0, 20).map((t) => ({
        id: t.id,
        tripNumber: t.tripNumber,
        status: t.status,
        expectedDeliveryDate: t.expectedDeliveryDate,
      })),
    };
  },
};
