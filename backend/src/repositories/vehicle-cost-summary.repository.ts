import { prisma } from '../config/db';

export const vehicleCostSummaryRepository = {
  findAssetWithVehicle(id: string) {
    return prisma.fixedAsset.findFirst({ where: { id, deletedAt: null }, include: { category: true, vehicle: true } });
  },

  groupExpensesByCategory(vehicleId: string) {
    return prisma.vehicleExpense.groupBy({
      by: ['category'],
      where: { vehicleId, approvalStatus: 'APPROVED' },
      _sum: { totalAmount: true },
    });
  },

  async sumDriverCostForVehicle(vehicleId: string) {
    const trips = await prisma.trip.findMany({ where: { vehicleId }, select: { id: true } });
    const tripIds = trips.map((t) => t.id);
    if (tripIds.length === 0) return { earnings: 0, advances: 0, tripRevenue: 0 };

    const [earnings, advances, revenue] = await Promise.all([
      prisma.driverEarning.aggregate({ where: { tripId: { in: tripIds }, approvalStatus: 'APPROVED' }, _sum: { amount: true } }),
      prisma.driverAdvance.aggregate({ where: { vehicleId, approvalStatus: 'APPROVED' }, _sum: { amount: true } }),
      prisma.trip.aggregate({ where: { vehicleId }, _sum: { freightAmount: true } }),
    ]);

    return {
      earnings: Number(earnings._sum.amount || 0),
      advances: Number(advances._sum.amount || 0),
      tripRevenue: Number(revenue._sum.freightAmount || 0),
    };
  },
};
