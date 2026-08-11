import { prisma } from '../config/db';

export const operationsDashboardService = {
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      pendingIntents,
      approvedIntents,
      tripsPlanned,
      tripsRunning,
      tripsCompleted,
      allNonTerminalTrips,
      supplierTripsCount,
      ownFleetTripsCount,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.intent.count({ where: { deletedAt: null, status: 'SUBMITTED' } }),
      prisma.intent.count({ where: { deletedAt: null, status: 'APPROVED' } }),
      prisma.trip.count({ where: { deletedAt: null, status: { in: ['PLANNED', 'APPROVED'] } } }),
      prisma.trip.count({
        where: { deletedAt: null, status: { in: ['STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING'] } },
      }),
      prisma.trip.count({ where: { deletedAt: null, status: 'COMPLETED', actualEndDate: { gte: startOfMonth } } }),
      prisma.trip.findMany({
        where: { deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED', 'DRAFT'] } },
        select: { id: true, tripNumber: true, expectedDeliveryDate: true, status: true },
      }),
      prisma.trip.count({ where: { deletedAt: null, supplierId: { not: null } } }),
      prisma.trip.count({ where: { deletedAt: null, supplierId: null, vehicleId: { not: null } } }),
      prisma.trip.aggregate({
        where: { deletedAt: null, status: 'COMPLETED', actualEndDate: { gte: startOfMonth } },
        _sum: { freightAmount: true },
      }),
    ]);

    const tripsDelayed = allNonTerminalTrips.filter(
      (t) => t.expectedDeliveryDate && new Date(t.expectedDeliveryDate) < now
    );

    return {
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
        month: startOfMonth.toISOString().slice(0, 7),
        totalFreightRevenue: monthlyRevenue._sum.freightAmount || 0,
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
