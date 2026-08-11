import { assetDashboardRepository } from '../repositories/asset-dashboard.repository';

export const assetDashboardService = {
  async get() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const expiringUntil = new Date(now);
    expiringUntil.setDate(expiringUntil.getDate() + 30);

    const [totalAssets, activeVehicles, vehicleValueAgg, loanOutstanding, todaysExpenseAgg, expiringCompliance, topExpenseVehicles] = await Promise.all([
      assetDashboardRepository.countActiveAssets(),
      assetDashboardRepository.countActiveVehicleAssets(),
      assetDashboardRepository.sumActiveVehicleValue(),
      assetDashboardRepository.sumLoanOutstanding(),
      assetDashboardRepository.sumTodaysExpenses(startOfDay, endOfDay),
      assetDashboardRepository.findExpiringCompliance(expiringUntil),
      assetDashboardRepository.topExpenseVehicles(5),
    ]);

    return {
      stats: {
        totalAssets,
        activeVehicles,
        totalVehicleValue: Number(vehicleValueAgg._sum.currentValue || 0),
        loanOutstanding,
        todaysExpenses: Number(todaysExpenseAgg._sum.totalAmount || todaysExpenseAgg._sum.amount || 0),
      },
      complianceDueSoon: expiringCompliance.map((r) => ({
        id: r.id,
        vehicle: { id: r.vehicle.id, registrationNumber: r.vehicle.registrationNumber },
        complianceType: r.complianceType,
        documentNumber: r.documentNumber,
        expiryDate: r.expiryDate,
      })),
      topExpenseVehicles,
    };
  },
};
