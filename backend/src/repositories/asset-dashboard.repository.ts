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

  async sumLoanOutstanding() {
    const [principal, repaid] = await Promise.all([
      prisma.vehicleLoan.aggregate({ where: { status: 'ACTIVE', deletedAt: null }, _sum: { principalAmount: true } }),
      prisma.vehicleLoanInstallment.aggregate({ where: { status: 'PAID', loan: { status: 'ACTIVE' } }, _sum: { principalComponent: true } }),
    ]);
    return Number(principal._sum.principalAmount || 0) - Number(repaid._sum.principalComponent || 0);
  },

  sumTodaysExpenses(startOfDay: Date, endOfDay: Date) {
    return prisma.vehicleExpense.aggregate({ where: { deletedAt: null, expenseDate: { gte: startOfDay, lte: endOfDay } }, _sum: { totalAmount: true, amount: true } });
  },

  findExpiringCompliance(until: Date) {
    return prisma.vehicleComplianceRecord.findMany({
      where: { status: 'ACTIVE', deletedAt: null, expiryDate: { lte: until } },
      include: { vehicle: { select: { id: true, registrationNumber: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 20,
    });
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
