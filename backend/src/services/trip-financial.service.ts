import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';

interface TripFinancialLine {
  tripId: string;
  tripNumber: string;
  income: number;
  supplierCharges: number;
  driverCost: number;
  dieselCost: number;
  fastTagCost: number;
  repairCost: number;
  otherExpenses: number;
  totalCost: number;
  profit: number;
}

// Repair-adjacent VehicleExpenseCategory values folded into one "Repairs"
// line, matching the Vehicle Financial State grouping below.
const REPAIR_CATEGORIES = ['REPAIR', 'SERVICE', 'BREAKDOWN', 'MAINTENANCE'];

/**
 * otherExpenses is the pre-existing driver-logged TripExpense lump (design
 * doc's original "trip cost" bucket) — left untouched. dieselCost/
 * fastTagCost/repairCost are additive, sourced from VehicleExpense rows
 * tagged with this trip (the FuelEntry/FastTagTransaction/Maintenance
 * mirror — see vehicle-expense.service.ts logFromSource). The two systems
 * are not deduplicated against each other: a driver who also manually logs
 * a FUEL/TOLL TripExpense for the same purchase will show it in both
 * otherExpenses and dieselCost/fastTagCost — a pre-existing overlap this
 * change does not attempt to resolve.
 */
async function computeTripLine(trip: {
  id: string;
  tripNumber: string;
  freightAmount: any;
  supplierRate: any;
  expenses: { amount: any }[];
}): Promise<TripFinancialLine> {
  const income = Number(trip.freightAmount || 0);
  const otherExpenses = trip.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const supplierCharges = Number(trip.supplierRate || 0);

  const [vehicleExpenses, driverEarnings] = await Promise.all([
    prisma.vehicleExpense.findMany({ where: { tripId: trip.id, deletedAt: null }, select: { category: true, amount: true } }),
    prisma.driverEarning.aggregate({ where: { tripId: trip.id, deletedAt: null }, _sum: { amount: true } }),
  ]);

  let dieselCost = 0;
  let fastTagCost = 0;
  let repairCost = 0;
  for (const e of vehicleExpenses) {
    const amount = Number(e.amount);
    if (e.category === 'FUEL') dieselCost += amount;
    else if (e.category === 'FASTTAG') fastTagCost += amount;
    else if (REPAIR_CATEGORIES.includes(e.category)) repairCost += amount;
  }
  const driverCost = Number(driverEarnings._sum.amount || 0);

  const totalCost = supplierCharges + driverCost + dieselCost + fastTagCost + repairCost + otherExpenses;

  return {
    tripId: trip.id,
    tripNumber: trip.tripNumber,
    income,
    supplierCharges,
    driverCost,
    dieselCost,
    fastTagCost,
    repairCost,
    otherExpenses,
    totalCost,
    profit: income - totalCost,
  };
}

interface GroupAccumulator {
  label: string;
  income: number;
  supplierCharges: number;
  driverCost: number;
  dieselCost: number;
  fastTagCost: number;
  repairCost: number;
  otherExpenses: number;
  tripCount: number;
}

function newAccumulator(label: string): GroupAccumulator {
  return { label, income: 0, supplierCharges: 0, driverCost: 0, dieselCost: 0, fastTagCost: 0, repairCost: 0, otherExpenses: 0, tripCount: 0 };
}

function accumulate(existing: GroupAccumulator, line: TripFinancialLine): GroupAccumulator {
  existing.income += line.income;
  existing.supplierCharges += line.supplierCharges;
  existing.driverCost += line.driverCost;
  existing.dieselCost += line.dieselCost;
  existing.fastTagCost += line.fastTagCost;
  existing.repairCost += line.repairCost;
  existing.otherExpenses += line.otherExpenses;
  existing.tripCount += 1;
  return existing;
}

function finalizeGroup(v: GroupAccumulator) {
  const totalCost = v.supplierCharges + v.driverCost + v.dieselCost + v.fastTagCost + v.repairCost + v.otherExpenses;
  return {
    tripCount: v.tripCount,
    income: v.income,
    supplierCharges: v.supplierCharges,
    driverCost: v.driverCost,
    dieselCost: v.dieselCost,
    fastTagCost: v.fastTagCost,
    repairCost: v.repairCost,
    otherExpenses: v.otherExpenses,
    totalCost,
    profit: v.income - totalCost,
  };
}

export const tripFinancialService = {
  async getForTrip(tripId: string) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      include: { expenses: { where: { deletedAt: null } } },
    });
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    return computeTripLine(trip);
  },

  async vehicleWise(from?: Date, to?: Date) {
    const trips = await prisma.trip.findMany({
      where: {
        deletedAt: null,
        status: 'COMPLETED',
        vehicleId: { not: null },
        ...(from || to
          ? { actualEndDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: { expenses: { where: { deletedAt: null } }, vehicle: true },
    });

    const grouped = new Map<string, GroupAccumulator>();
    for (const trip of trips) {
      const key = trip.vehicleId as string;
      const line = await computeTripLine(trip);
      grouped.set(key, accumulate(grouped.get(key) || newAccumulator(trip.vehicle?.registrationNumber || 'Unknown'), line));
    }

    return Array.from(grouped.entries()).map(([vehicleId, v]) => ({ vehicleId, registrationNumber: v.label, ...finalizeGroup(v) }));
  },

  async supplierWise(from?: Date, to?: Date) {
    const trips = await prisma.trip.findMany({
      where: {
        deletedAt: null,
        status: 'COMPLETED',
        supplierId: { not: null },
        ...(from || to
          ? { actualEndDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: { expenses: { where: { deletedAt: null } }, supplier: true },
    });

    const grouped = new Map<string, GroupAccumulator>();
    for (const trip of trips) {
      const key = trip.supplierId as string;
      const line = await computeTripLine(trip);
      grouped.set(key, accumulate(grouped.get(key) || newAccumulator(trip.supplier?.name || 'Unknown'), line));
    }

    return Array.from(grouped.entries()).map(([supplierId, v]) => ({ supplierId, supplierName: v.label, ...finalizeGroup(v) }));
  },

  async customerWise(from?: Date, to?: Date) {
    const trips = await prisma.trip.findMany({
      where: {
        deletedAt: null,
        status: 'COMPLETED',
        ...(from || to
          ? { actualEndDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: { expenses: { where: { deletedAt: null } }, intent: { include: { company: true } } },
    });

    const grouped = new Map<string, GroupAccumulator>();
    for (const trip of trips) {
      const key = trip.intent.companyId;
      const line = await computeTripLine(trip);
      grouped.set(key, accumulate(grouped.get(key) || newAccumulator(trip.intent.company.name), line));
    }

    return Array.from(grouped.entries()).map(([companyId, v]) => ({ companyId, companyName: v.label, ...finalizeGroup(v) }));
  },
};
