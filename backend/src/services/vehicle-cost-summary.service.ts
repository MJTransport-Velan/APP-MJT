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
    const [depreciation, expenseGroups] = await Promise.all([
      vehicleCostSummaryRepository.sumDepreciationToDate(assetId),
      asset.vehicleId ? vehicleCostSummaryRepository.groupExpensesByCategory(asset.vehicleId) : Promise.resolve([]),
    ]);
    const depreciationToDate = Number(depreciation._sum.depreciationAmount || 0);

    const expensesByCategory = expenseGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.category] = Number(g._sum.totalAmount || 0);
      return acc;
    }, {});
    const totalExpenses = Object.values(expensesByCategory).reduce((s, v) => s + v, 0);

    let loanPrincipalRepaid = 0;
    let loanInterestPaid = 0;
    let driverCost = 0;
    let tripRevenue = 0;

    if (asset.vehicleId) {
      const [loanTotals, driverTotals] = await Promise.all([
        vehicleCostSummaryRepository.sumPaidInstallmentsForVehicle(asset.vehicleId),
        vehicleCostSummaryRepository.sumDriverCostForVehicle(asset.vehicleId),
      ]);
      loanPrincipalRepaid = Number(loanTotals._sum.principalComponent || 0);
      loanInterestPaid = Number(loanTotals._sum.interestComponent || 0);
      driverCost = driverTotals.earnings + driverTotals.advances;
      tripRevenue = driverTotals.tripRevenue;
    }

    const totalCost = purchaseCost + loanPrincipalRepaid + loanInterestPaid + depreciationToDate + totalExpenses + driverCost;

    return {
      asset: { id: asset.id, assetCode: asset.assetCode, assetName: asset.assetName, category: asset.category.name },
      vehicle: asset.vehicle ? { id: asset.vehicle.id, registrationNumber: asset.vehicle.registrationNumber } : null,
      purchaseCost,
      loanPrincipalRepaid,
      loanInterestPaid,
      depreciationToDate,
      expensesByCategory,
      totalExpenses,
      driverCost,
      tripRevenue,
      totalCost,
    };
  },
};
