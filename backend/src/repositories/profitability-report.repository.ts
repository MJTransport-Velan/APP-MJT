import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const profitabilityReportRepository = {
  findCompletedTrips(from: Date, to: Date, extraWhere: Prisma.TripWhereInput = {}) {
    return prisma.trip.findMany({
      where: { deletedAt: null, status: 'COMPLETED', actualEndDate: { gte: from, lte: to }, ...extraWhere },
      include: {
        intent: { include: { company: { select: { id: true, name: true } } } },
        vehicle: { select: { id: true, registrationNumber: true } },
        driver: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        expenses: { where: { deletedAt: null } },
      },
    });
  },

  findDriverCostForTrips(tripIds: string[]) {
    if (tripIds.length === 0) return Promise.resolve([]);
    return prisma.driverEarning.findMany({ where: { tripId: { in: tripIds }, approvalStatus: 'APPROVED' }, select: { tripId: true, driverId: true, amount: true } });
  },
};
