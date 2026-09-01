import { assetDashboardRepository } from '../repositories/asset-dashboard.repository';
import { DateRange, hasRange, resolveRange, todayRange } from '../utils/dateRange';

export const assetDashboardService = {
  /**
   * @param range From/To window for the expense figures — the spend tile and
   * the top-spending vehicles list. Asset counts and current book value are
   * a register of what is owned today, so they are not period-scoped.
   */
  async get(range: DateRange = {}) {
    const period = resolveRange(range, todayRange);
    // Top spenders ranked all-time before the filter existed; defaulting
    // them to today would leave the list empty on most days.
    const topSpendRange = hasRange(range) ? period : {};

    const [totalAssets, activeVehicles, vehicleValueAgg, periodExpenseAgg, assetsByCategory, topExpenseVehicles] = await Promise.all([
      assetDashboardRepository.countActiveAssets(),
      assetDashboardRepository.countActiveVehicleAssets(),
      assetDashboardRepository.sumActiveVehicleValue(),
      assetDashboardRepository.sumExpensesInRange(period),
      assetDashboardRepository.countByCategory(8),
      assetDashboardRepository.topExpenseVehicles(5, topSpendRange),
    ]);

    return {
      period: { from: period.from, to: period.to, filtered: hasRange(range) },
      stats: {
        totalAssets,
        activeVehicles,
        totalVehicleValue: Number(vehicleValueAgg._sum.currentValue || 0),
        todaysExpenses: Number(periodExpenseAgg._sum.totalAmount || periodExpenseAgg._sum.amount || 0),
      },
      assetsByCategory,
      topExpenseVehicles,
    };
  },
};
