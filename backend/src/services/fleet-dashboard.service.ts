import { prisma } from '../config/db';
import { DateRange, hasRange, rangeWhere, resolveRange, currentMonthRange } from '../utils/dateRange';

export const fleetDashboardService = {
  /**
   * @param range From/To window for the cost figures. Vehicle counts and
   * status are live fleet state, and the document-expiry list looks
   * forward 30 days from today — neither is something a reporting window
   * over past expenses can narrow, so both stay as they are.
   */
  async getSummary(range: DateRange = {}) {
    const now = new Date();
    const costRange = resolveRange(range, currentMonthRange);
    const costWhere = rangeWhere('expenseDate', costRange);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalVehicles,
      ownVehicles,
      marketVehicles,
      availableVehicles,
      runningVehicles,
      underMaintenanceVehicles,
      inactiveVehicles,
      periodFuelCost,
      periodMaintenanceCost,
      periodExpensesByCategory,
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
        where: { deletedAt: null, category: 'FUEL', ...costWhere },
        _sum: { amount: true },
      }),
      prisma.vehicleExpense.aggregate({
        where: { deletedAt: null, category: 'MAINTENANCE', ...costWhere },
        _sum: { amount: true },
      }),
      prisma.vehicleExpense.groupBy({
        by: ['category'],
        where: { deletedAt: null, ...costWhere },
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
      period: { from: costRange.from, to: costRange.to, filtered: hasRange(range) },
      costSummary: {
        month: costRange.from.toISOString().slice(0, 7),
        from: costRange.from,
        to: costRange.to,
        fuelCost: periodFuelCost._sum.amount || 0,
        maintenanceCost: periodMaintenanceCost._sum.amount || 0,
        byCategory: periodExpensesByCategory.map((row) => ({
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
