import { Request } from 'express';
import { profitabilityReportRepository } from '../repositories/profitability-report.repository';

function parseRange(query: Request['query']) {
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(to.getFullYear(), to.getMonth(), 1);
  return { from, to };
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

interface GroupAccumulator {
  label: string;
  revenue: number;
  tripExpense: number;
  supplierCharge: number;
  driverCost: number;
  tripCount: number;
}

/**
 * Every profitability dimension below shares one formula — Trip revenue
 * (freightAmount) less TripExpense, supplier charge, and driver cost —
 * only the grouping key differs. Reuses the same COMPLETED-trip source
 * the pre-existing (pre-Voucher-Engine) tripProfitabilityReport already
 * established, extended with driver cost and grouped by whichever
 * dimension the caller asks for (design doc §Profitability Reports).
 */
async function computeGrouped(
  from: Date,
  to: Date,
  extraWhere: Record<string, unknown>,
  keyOf: (trip: Awaited<ReturnType<typeof profitabilityReportRepository.findCompletedTrips>>[number]) => { key: string; label: string } | null
) {
  const trips = await profitabilityReportRepository.findCompletedTrips(from, to, extraWhere);
  const driverCosts = await profitabilityReportRepository.findDriverCostForTrips(trips.map((t) => t.id));
  const driverCostByTrip = new Map<string, number>();
  for (const dc of driverCosts) {
    driverCostByTrip.set(dc.tripId!, (driverCostByTrip.get(dc.tripId!) || 0) + Number(dc.amount));
  }

  const groups = new Map<string, GroupAccumulator>();
  for (const trip of trips) {
    const keyed = keyOf(trip);
    if (!keyed) continue;
    const existing = groups.get(keyed.key) || { label: keyed.label, revenue: 0, tripExpense: 0, supplierCharge: 0, driverCost: 0, tripCount: 0 };
    existing.revenue += Number(trip.freightAmount || 0);
    existing.tripExpense += trip.expenses.reduce((s, e) => s + Number(e.amount), 0);
    existing.supplierCharge += Number(trip.supplierRate || 0);
    existing.driverCost += driverCostByTrip.get(trip.id) || 0;
    existing.tripCount += 1;
    groups.set(keyed.key, existing);
  }

  return Array.from(groups.entries())
    .map(([key, g]) => ({
      key,
      label: g.label,
      tripCount: g.tripCount,
      revenue: round2(g.revenue),
      tripExpense: round2(g.tripExpense),
      supplierCharge: round2(g.supplierCharge),
      driverCost: round2(g.driverCost),
      profit: round2(g.revenue - g.tripExpense - g.supplierCharge - g.driverCost),
    }))
    .sort((a, b) => b.profit - a.profit);
}

export const profitabilityReportService = {
  async customerProfitability(query: Request['query']) {
    const { from, to } = parseRange(query);
    const rows = await computeGrouped(from, to, {}, (t) => ({ key: t.intent.company.id, label: t.intent.company.name }));
    return { from, to, rows };
  },

  async supplierProfitability(query: Request['query']) {
    const { from, to } = parseRange(query);
    const rows = await computeGrouped(from, to, { supplierId: { not: null } }, (t) => (t.supplier ? { key: t.supplier.id, label: t.supplier.name } : null));
    return { from, to, rows };
  },

  async vehicleProfitability(query: Request['query']) {
    const { from, to } = parseRange(query);
    const rows = await computeGrouped(from, to, { vehicleId: { not: null } }, (t) => (t.vehicle ? { key: t.vehicle.id, label: t.vehicle.registrationNumber } : null));
    return { from, to, rows };
  },

  async driverProfitability(query: Request['query']) {
    const { from, to } = parseRange(query);
    const rows = await computeGrouped(from, to, { driverId: { not: null } }, (t) => (t.driver ? { key: t.driver.id, label: t.driver.name } : null));
    return { from, to, rows };
  },

  async routeProfitability(query: Request['query']) {
    const { from, to } = parseRange(query);
    const rows = await computeGrouped(from, to, { routeId: { not: null } }, (t) => (t.route ? { key: t.route.id, label: t.route.name } : null));
    return { from, to, rows };
  },
};
