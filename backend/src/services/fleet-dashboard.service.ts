import { prisma } from '../config/db';

export const fleetDashboardService = {
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalVehicles,
      ownVehicles,
      marketVehicles,
      availableVehicles,
      runningVehicles,
      underMaintenanceVehicles,
      inactiveVehicles,
      monthlyFuelCost,
      monthlyMaintenanceCost,
      monthlyExpensesByCategory,
      expiringDocuments,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { deletedAt: null } }),
      prisma.vehicle.count({ where: { deletedAt: null, ownership: 'OWN' } }),
      prisma.vehicle.count({ where: { deletedAt: null, ownership: 'MARKET' } }),
      prisma.vehicle.count({ where: { deletedAt: null, status: 'AVAILABLE' } }),
      prisma.vehicle.count({ where: { deletedAt: null, status: 'RUNNING' } }),
      prisma.vehicle.count({ where: { deletedAt: null, status: 'UNDER_MAINTENANCE' } }),
      prisma.vehicle.count({ where: { deletedAt: null, status: 'INACTIVE' } }),
      prisma.vehicleExpense.aggregate({
        where: { deletedAt: null, category: 'FUEL', expenseDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.vehicleExpense.aggregate({
        where: { deletedAt: null, category: 'MAINTENANCE', expenseDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.vehicleExpense.groupBy({
        by: ['category'],
        where: { deletedAt: null, expenseDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.vehicle.findMany({
        where: {
          deletedAt: null,
          OR: [
            { insuranceExpiryDate: { lte: in30Days } },
            { permitExpiryDate: { lte: in30Days } },
            { fitnessExpiryDate: { lte: in30Days } },
            { pucExpiryDate: { lte: in30Days } },
          ],
        },
        select: {
          id: true,
          registrationNumber: true,
          insuranceExpiryDate: true,
          permitExpiryDate: true,
          fitnessExpiryDate: true,
          pucExpiryDate: true,
        },
        take: 50,
      }),
    ]);

    return {
      fleetSummary: {
        totalVehicles,
        ownVehicles,
        marketVehicles,
      },
      statusSummary: {
        available: availableVehicles,
        running: runningVehicles,
        underMaintenance: underMaintenanceVehicles,
        inactive: inactiveVehicles,
      },
      costSummary: {
        month: startOfMonth.toISOString().slice(0, 7),
        fuelCost: monthlyFuelCost._sum.amount || 0,
        maintenanceCost: monthlyMaintenanceCost._sum.amount || 0,
        byCategory: monthlyExpensesByCategory.map((row) => ({
          category: row.category,
          total: row._sum.amount || 0,
        })),
      },
      documentExpirySummary: expiringDocuments.map((v) => ({
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        insuranceExpiryDate: v.insuranceExpiryDate,
        permitExpiryDate: v.permitExpiryDate,
        fitnessExpiryDate: v.fitnessExpiryDate,
        pucExpiryDate: v.pucExpiryDate,
      })),
    };
  },
};
