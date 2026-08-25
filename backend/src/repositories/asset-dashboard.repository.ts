import { prisma } from '../config/db';

export const assetDashboardRepository = {
  countActiveAssets() {
    return prisma.fixedAsset.count({ where: { status: 'ACTIVE', deletedAt: null } });
  },

  countActiveVehicleAssets() {
    return prisma.fixedAsset.count({ where: { status: 'ACTIVE', deletedAt: null, vehicleId: { not: null } } });
  },

  sumActiveVehicleValue() {
    return prisma.fixedAsset.aggregate({ where: { status: 'ACTIVE', deletedAt: null, vehicleId: { not: null } }, _sum: { currentValue: true } });
  },

  sumTodaysExpenses(startOfDay: Date, endOfDay: Date) {
    return prisma.vehicleExpense.aggregate({ where: { deletedAt: null, expenseDate: { gte: startOfDay, lte: endOfDay } }, _sum: { totalAmount: true, amount: true } });
  },

  async countByCategory(take: number) {
    const groups = await prisma.fixedAsset.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null, status: 'ACTIVE' },
      _count: { _all: true },
      _sum: { currentValue: true },
      orderBy: { _sum: { currentValue: 'desc' } },
      take,
    });
    const categories = await prisma.assetCategory.findMany({ where: { id: { in: groups.map((g) => g.categoryId) } }, select: { id: true, name: true } });
    const byId = new Map(categories.map((c) => [c.id, c]));
    return groups.map((g) => ({
      category: byId.get(g.categoryId) ?? null,
      assetCount: g._count._all,
      totalValue: Number(g._sum.currentValue || 0),
    }));
  },

  async topExpenseVehicles(take: number) {
    const groups = await prisma.vehicleExpense.groupBy({
      by: ['vehicleId'],
      where: { deletedAt: null, approvalStatus: 'APPROVED' },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take,
    });
    const vehicles = await prisma.vehicle.findMany({ where: { id: { in: groups.map((g) => g.vehicleId) } }, select: { id: true, registrationNumber: true } });
    const byId = new Map(vehicles.map((v) => [v.id, v]));
    return groups.map((g) => ({ vehicle: byId.get(g.vehicleId) ?? null, totalExpense: Number(g._sum.totalAmount || 0) }));
  },
};
