import { vehicleCostSummaryRepository } from '../repositories/vehicle-cost-summary.repository';
import { AppError } from '../middlewares/error.middleware';

/**
 * Read-only aggregation, additive alongside (not replacing)
 * trip-financial.service.ts — that service reads TripExpense exclusively
 * for trip-level P&L and has no awareness of a vehicle's own fixed/running
 * costs (design doc §15). Cost Per KM / ROI are explicitly out of scope —
 * no continuous odometer-distance ledger exists at the vehicle level yet.
 */
export const vehicleCostSummaryService = {
  async getForAsset(assetId: string) {
    const asset = await vehicleCostSummaryRepository.findAssetWithVehicle(assetId);
    if (!asset) throw new AppError('Fixed Asset not found', 404);

    const purchaseCost = Number(asset.purchaseValue);
    const expenseGroups = asset.vehicleId ? await vehicleCostSummaryRepository.groupExpensesByCategory(asset.vehicleId) : [];

    const expensesByCategory = expenseGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.category] = Number(g._sum.totalAmount || 0);
      return acc;
    }, {});
    const totalExpenses = Object.values(expensesByCategory).reduce((s, v) => s + v, 0);

    let driverCost = 0;
    let tripRevenue = 0;

    if (asset.vehicleId) {
      const driverTotals = await vehicleCostSummaryRepository.sumDriverCostForVehicle(asset.vehicleId);
      driverCost = driverTotals.earnings + driverTotals.advances;
      tripRevenue = driverTotals.tripRevenue;
    }

    const totalCost = purchaseCost + totalExpenses + driverCost;

    return {
      asset: { id: asset.id, assetCode: asset.assetCode, assetName: asset.assetName, category: asset.category.name },
      vehicle: asset.vehicle ? { id: asset.vehicle.id, registrationNumber: asset.vehicle.registrationNumber } : null,
      purchaseCost,
      expensesByCategory,
      totalExpenses,
      driverCost,
      tripRevenue,
      totalCost,
    };
  },
};
