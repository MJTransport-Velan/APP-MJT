import { assetDashboardRepository } from '../repositories/asset-dashboard.repository';

export const assetDashboardService = {
  async get() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [totalAssets, activeVehicles, vehicleValueAgg, todaysExpenseAgg, assetsByCategory, topExpenseVehicles] = await Promise.all([
      assetDashboardRepository.countActiveAssets(),
      assetDashboardRepository.countActiveVehicleAssets(),
      assetDashboardRepository.sumActiveVehicleValue(),
      assetDashboardRepository.sumTodaysExpenses(startOfDay, endOfDay),
      assetDashboardRepository.countByCategory(8),
      assetDashboardRepository.topExpenseVehicles(5),
    ]);

    return {
      stats: {
        totalAssets,
        activeVehicles,
        totalVehicleValue: Number(vehicleValueAgg._sum.currentValue || 0),
        todaysExpenses: Number(todaysExpenseAgg._sum.totalAmount || todaysExpenseAgg._sum.amount || 0),
      },
      assetsByCategory,
      topExpenseVehicles,
    };
  },
};
