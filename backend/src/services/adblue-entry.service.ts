/**
 * AdBlue top-ups, truck by truck.
 *
 * Two ways AdBlue reaches a truck, and the fleet runs both:
 *
 *   FROM_STOCK      — drums bought in bulk and kept at the yard, then
 *                     poured into whichever truck needs topping up. The
 *                     litres come off the shared store and are costed at
 *                     the store's own weighted-average rate; nobody types a
 *                     rate here, because the fleet already paid for these
 *                     litres and what they cost is a fact, not a choice.
 *   DIRECT_PURCHASE — bought at a pump on the road and put straight into
 *                     the tank. Nothing is ever stored, so nothing moves in
 *                     the store; the figures come off the roadside bill,
 *                     exactly like a Direct Payment fuel entry.
 *
 * Either way the cost is mirrored into VehicleExpense under the ADBLUE
 * category, so it lands on the truck once and shows up in P&L and vehicle
 * running-cost reports the same way diesel and FASTag do.
 */
import { Request } from 'express';
import { adBlueEntryRepository, AdBlueEntryWithRelations } from '../repositories/adblue-entry.repository';
import { tripRepository } from '../repositories/trip.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { vehicleExpenseInternalService } from './vehicle-expense.service';
import { adBlueStockInternalService } from './adblue-stock.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateAdBlueEntryInput, UpdateAdBlueEntryInput } from '../validators/adblue-entry.validator';

const round2 = (value: number) => Number(value.toFixed(2));

const toNumber = (value: unknown) => (value == null ? undefined : Number(value));

/**
 * Quantity, rate and amount for a roadside buy, resolved the same way a
 * fuel entry resolves them (see resolveFuelFigures in fuel-entry.service):
 * whichever two are known determine the third, the amount paid is
 * authoritative when given, and whatever stays unknown is stored null
 * rather than invented.
 *
 * This is only ever used for DIRECT_PURCHASE. A FROM_STOCK entry is priced
 * by the store, not by what was typed.
 */
function resolveDirectFigures(input: { quantityLiters?: number; ratePerLiter?: number; totalAmount?: number }) {
  let quantityLiters = input.quantityLiters ?? null;
  let ratePerLiter = input.ratePerLiter ?? null;
  const totalAmount = input.totalAmount ?? null;

  if (totalAmount != null) {
    if (quantityLiters != null && ratePerLiter == null) {
      ratePerLiter = round2(totalAmount / quantityLiters);
    } else if (ratePerLiter != null && quantityLiters == null) {
      quantityLiters = round2(totalAmount / ratePerLiter);
    }
    return { quantityLiters, ratePerLiter, totalAmount };
  }

  if (quantityLiters != null && ratePerLiter != null) {
    return { quantityLiters, ratePerLiter, totalAmount: round2(quantityLiters * ratePerLiter) };
  }

  return { quantityLiters, ratePerLiter, totalAmount };
}

/**
 * `from`/`to` arrive as date-only strings (YYYY-MM-DD, parsed as UTC
 * midnight); `to` is pushed to the end of its day so the whole day counts.
 */
function parseEntryDateRange(query: Request['query']): { from?: Date; to?: Date } {
  const from = query.from ? new Date(query.from as string) : undefined;
  let to: Date | undefined;
  if (query.to) {
    to = new Date(query.to as string);
    to.setUTCHours(23, 59, 59, 999);
  }
  return { from, to };
}

/** How a top-up reads in audit trails and mirrored expense rows, given either figure may be unknown. */
function describeTopUp(figures: { quantityLiters: number | null; totalAmount: number | null }) {
  if (figures.quantityLiters != null) return `${figures.quantityLiters}L`;
  if (figures.totalAmount != null) return `${figures.totalAmount}`;
  return 'quantity not recorded';
}

function serialize(entry: AdBlueEntryWithRelations) {
  return {
    id: entry.id,
    source: entry.source,
    location: entry.location,
    quantityLiters: entry.quantityLiters,
    ratePerLiter: entry.ratePerLiter,
    totalAmount: entry.totalAmount,
    odometerReading: entry.odometerReading,
    invoiceNumber: entry.invoiceNumber,
    referenceNumber: entry.referenceNumber,
    remarks: entry.remarks,
    entryDate: entry.entryDate,
    billDocument: entry.billDocument,
    vehicle: { id: entry.vehicle.id, registrationNumber: entry.vehicle.registrationNumber },
    trip: entry.trip ? { id: entry.trip.id, tripNumber: entry.trip.tripNumber } : null,
    driver: entry.driver ? { id: entry.driver.id, name: entry.driver.name, code: entry.driver.code } : null,
    supplier: entry.supplier ? { id: entry.supplier.id, name: entry.supplier.name } : null,
    paymentMode: entry.paymentMode ? { id: entry.paymentMode.id, name: entry.paymentMode.name } : null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

type AdBlueAggregate = {
  _sum: { quantityLiters: unknown; totalAmount: unknown };
  _avg: { ratePerLiter: unknown };
  _count: { _all: number };
};

/** The figures every AdBlue dashboard shows, derived from one Prisma aggregate. */
function summarizeAggregate(agg: AdBlueAggregate) {
  return {
    totalLiters: round2(Number(agg._sum.quantityLiters || 0)),
    totalCost: round2(Number(agg._sum.totalAmount || 0)),
    avgRate: agg._avg.ratePerLiter != null ? round2(Number(agg._avg.ratePerLiter)) : null,
    entryCount: agg._count._all,
  };
}

export const adBlueEntryService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const range = parseEntryDateRange(query);
    const { rows, total } = await adBlueEntryRepository.findManyPaginated({
      skip,
      take,
      vehicleId: (query.vehicleId as string) || undefined,
      tripId: (query.tripId as string) || undefined,
      driverId: (query.driverId as string) || undefined,
      source: (query.source as string) || undefined,
      ...range,
    });

    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const entry = await adBlueEntryRepository.findById(id);
    if (!entry) {
      throw new AppError('AdBlue entry not found', 404);
    }
    return serialize(entry);
  },

  async create(input: CreateAdBlueEntryInput, actorId: string) {
    const vehicle = await adBlueEntryRepository.findVehicleById(input.vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    if (input.supplierId) {
      const supplier = await adBlueEntryRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);
    }
    if (input.paymentModeId) {
      const paymentMode = await adBlueEntryRepository.findPaymentModeById(input.paymentModeId);
      if (!paymentMode) throw new AppError('Payment mode not found', 404);
    }

    const entryDate = input.entryDate ? new Date(input.entryDate) : new Date();
    if (Number.isNaN(entryDate.getTime())) {
      throw new AppError('Invalid AdBlue entry date', 400);
    }

    // Trip isn't picked manually — it's derived from whichever trip this
    // vehicle was actually running at the entry's date, unless the caller
    // explicitly named one. Driver is never picked manually at all — it
    // always comes from that trip's assigned driver.
    let tripId = input.tripId;
    let driverId: string | undefined;
    if (tripId) {
      const trip = await adBlueEntryRepository.findTripById(tripId);
      if (!trip) throw new AppError('Trip not found', 404);
      if (trip.vehicleId !== input.vehicleId) {
        throw new AppError('The selected vehicle is not assigned to this trip', 422);
      }
      driverId = trip.driverId ?? undefined;
    } else {
      const activeTrip = await tripRepository.findActiveTripForVehicleOnDate(input.vehicleId, entryDate);
      if (activeTrip) {
        tripId = activeTrip.id;
        driverId = activeTrip.driverId ?? undefined;
      }
    }

    const fromStock = input.source === 'FROM_STOCK';
    // Stock litres are priced by the store before anything is written, so
    // the entry and the withdrawal it will own cannot disagree. This also
    // fails early — before an entry row exists — when the store is empty or
    // does not hold enough.
    const figures = fromStock
      ? {
          quantityLiters: input.quantityLiters as number,
          ...(await adBlueStockInternalService.resolveIssueValuation({
            quantityLiters: input.quantityLiters as number,
            actorId,
          })),
        }
      : resolveDirectFigures(input);

    const entry = await adBlueEntryRepository.create({
      vehicleId: input.vehicleId,
      source: input.source,
      location: input.location,
      tripId,
      driverId,
      supplierId: input.supplierId,
      paymentModeId: input.paymentModeId,
      quantityLiters: figures.quantityLiters,
      ratePerLiter: figures.ratePerLiter,
      totalAmount: figures.totalAmount,
      odometerReading: input.odometerReading,
      invoiceNumber: input.invoiceNumber,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      entryDate,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'AdBlueEntry',
      entityId: entry.id,
      description: `Recorded AdBlue entry for vehicle ${vehicle.registrationNumber} (${describeTopUp(figures)})`,
    });

    // Nothing to mirror into vehicle expenses until the top-up has a cost —
    // a litres-only roadside entry gets its expense row when an amount is
    // filled in later (see update below). A stock issue always has one.
    if (figures.totalAmount != null) {
      await vehicleExpenseInternalService.logFromSource({
        vehicleId: input.vehicleId,
        tripId,
        category: 'ADBLUE',
        amount: figures.totalAmount,
        expenseDate: entryDate,
        description: `AdBlue: ${describeTopUp(figures)}`,
        referenceType: 'AdBlueEntry',
        referenceId: entry.id,
        actorId,
      });
    }

    // A stock-filled top-up takes those litres off the shared store. This
    // is the same consumption as the expense above, not a second cost.
    await adBlueStockInternalService.syncFromEntry({
      adBlueEntryId: entry.id,
      vehicleId: input.vehicleId,
      fromStock,
      quantityLiters: figures.quantityLiters,
      ratePerLiter: figures.ratePerLiter,
      totalAmount: figures.totalAmount,
      entryDate,
      actorId,
    });

    return adBlueEntryService.getById(entry.id);
  },

  async update(id: string, input: UpdateAdBlueEntryInput, actorId: string) {
    const existing = await adBlueEntryRepository.findById(id);
    if (!existing) {
      throw new AppError('AdBlue entry not found', 404);
    }

    if (input.supplierId) {
      const supplier = await adBlueEntryRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);
    }
    if (input.paymentModeId) {
      const paymentMode = await adBlueEntryRepository.findPaymentModeById(input.paymentModeId);
      if (!paymentMode) throw new AppError('Payment mode not found', 404);
    }

    const entryDate = input.entryDate ? new Date(input.entryDate) : existing.entryDate;
    const source = input.source ?? existing.source;
    const fromStock = source === 'FROM_STOCK';

    let figures: { quantityLiters: number | null; ratePerLiter: number | null; totalAmount: number | null };
    if (fromStock) {
      // Stock litres stay priced by the store. An entry that was already a
      // withdrawal keeps the rate it was first valued at (the litres left
      // the shelf when they left it); one only now becoming a withdrawal is
      // valued at today's average — resolveIssueValuation decides which.
      const quantityLiters = input.quantityLiters ?? toNumber(existing.quantityLiters);
      if (quantityLiters == null) {
        throw new AppError('Enter how many litres were taken from stock', 422);
      }
      const valuation = await adBlueStockInternalService.resolveIssueValuation({
        quantityLiters,
        adBlueEntryId: id,
        actorId,
      });
      figures = { quantityLiters, ...valuation };
    } else {
      // Whichever figure the caller just sent is the one to believe: a new
      // amount re-derives the rate, new litres/rate re-derive the amount.
      // Untouched figures fall back to what is already stored — except when
      // this entry has just stopped drawing on stock, where the stored rate
      // was the store's, not the road's, and would be misleading here.
      const wasFromStock = existing.source === 'FROM_STOCK';
      figures = resolveDirectFigures({
        quantityLiters: input.quantityLiters ?? toNumber(existing.quantityLiters),
        ratePerLiter:
          input.ratePerLiter ??
          (input.totalAmount != null || wasFromStock ? undefined : toNumber(existing.ratePerLiter)),
        totalAmount:
          input.totalAmount ??
          (input.quantityLiters != null || input.ratePerLiter != null || wasFromStock
            ? undefined
            : toNumber(existing.totalAmount)),
      });
    }

    // Trip/driver are only touched when the caller explicitly names a trip,
    // or changes the date (which may put the vehicle on a different trip —
    // or no trip at all, in which case both clear back to null). Driver is
    // never picked manually — it always follows whichever trip is resolved.
    let tripId: string | undefined = input.tripId;
    let driverId: string | undefined;
    let tripTouched = false;
    if (input.tripId) {
      const trip = await adBlueEntryRepository.findTripById(input.tripId);
      if (!trip) throw new AppError('Trip not found', 404);
      if (trip.vehicleId !== existing.vehicleId) {
        throw new AppError("The selected trip is not assigned to this AdBlue entry's vehicle", 422);
      }
      driverId = trip.driverId ?? undefined;
      tripTouched = true;
    } else if (input.entryDate) {
      const activeTrip = await tripRepository.findActiveTripForVehicleOnDate(existing.vehicleId, entryDate);
      tripId = activeTrip?.id;
      driverId = activeTrip?.driverId ?? undefined;
      tripTouched = true;
    }

    await adBlueEntryRepository.update(id, {
      source,
      location: input.location,
      tripId: tripTouched ? (tripId ?? null) : undefined,
      driverId: tripTouched ? (driverId ?? null) : undefined,
      supplierId: input.supplierId,
      paymentModeId: input.paymentModeId,
      quantityLiters: figures.quantityLiters,
      ratePerLiter: figures.ratePerLiter,
      totalAmount: figures.totalAmount,
      odometerReading: input.odometerReading,
      invoiceNumber: input.invoiceNumber,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      entryDate: input.entryDate ? entryDate : undefined,
      updatedById: actorId,
    });

    // An entry recorded without a cost has no mirrored expense row yet, and
    // updateFromSource no-ops on a missing mirror — so once an amount lands,
    // that row has to be created rather than updated.
    if (figures.totalAmount != null && existing.totalAmount == null) {
      await vehicleExpenseInternalService.logFromSource({
        vehicleId: existing.vehicleId,
        tripId: tripTouched ? tripId : (existing.tripId ?? undefined),
        category: 'ADBLUE',
        amount: figures.totalAmount,
        expenseDate: entryDate,
        description: `AdBlue: ${describeTopUp(figures)}`,
        referenceType: 'AdBlueEntry',
        referenceId: id,
        actorId,
      });
    } else if (figures.totalAmount != null) {
      await vehicleExpenseInternalService.updateFromSource({
        referenceType: 'AdBlueEntry',
        referenceId: id,
        tripId: tripTouched ? (tripId ?? null) : undefined,
        amount: figures.totalAmount,
        expenseDate: input.entryDate ? entryDate : undefined,
        description: `AdBlue: ${describeTopUp(figures)}`,
        actorId,
      });
    }

    // Re-point the stock withdrawal at whatever the top-up now says. An edit
    // can start a withdrawal (a roadside buy corrected to a stock issue),
    // end one (the reverse), or just resize it — syncFromEntry covers all
    // three, so the store never drifts from the top-ups behind it.
    await adBlueStockInternalService.syncFromEntry({
      adBlueEntryId: id,
      vehicleId: existing.vehicleId,
      fromStock,
      quantityLiters: figures.quantityLiters,
      ratePerLiter: figures.ratePerLiter,
      totalAmount: figures.totalAmount,
      entryDate,
      actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'AdBlueEntry',
      entityId: id,
      description: `Updated AdBlue entry for vehicle ${existing.vehicle.registrationNumber}`,
    });

    return adBlueEntryService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await adBlueEntryRepository.findById(id);
    if (!existing) {
      throw new AppError('AdBlue entry not found', 404);
    }

    await adBlueEntryRepository.softDelete(id, actorId);
    await vehicleExpenseInternalService.removeFromSource({ referenceType: 'AdBlueEntry', referenceId: id, actorId });
    // Deleting a stock-filled top-up puts its litres back on the shelf.
    await adBlueStockInternalService.removeFromEntry(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'AdBlueEntry',
      entityId: id,
      description: `Deleted AdBlue entry for vehicle ${existing.vehicle.registrationNumber}`,
    });
  },

  async setBillDocument(id: string, filePath: string, actorId: string) {
    const existing = await adBlueEntryRepository.findById(id);
    if (!existing) throw new AppError('AdBlue entry not found', 404);
    await adBlueEntryRepository.update(id, { billDocument: filePath, updatedById: actorId });
    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'AdBlueEntry',
      entityId: id,
      description: 'Uploaded AdBlue bill document',
    });
    return adBlueEntryService.getById(id);
  },

  /**
   * The AdBlue tab's headline figures across the fleet (or one truck),
   * split by where the AdBlue came from — how much of the fleet's AdBlue is
   * being bought on the road rather than drawn from the yard is exactly the
   * thing this module exists to make visible.
   */
  async summary(query: Request['query']) {
    const range = parseEntryDateRange(query);
    const vehicleId = (query.vehicleId as string) || undefined;
    const { agg, latest, bySource } = await adBlueEntryRepository.consumptionAggregate({ vehicleId, ...range });

    const emptySource = { totalLiters: 0, totalCost: 0, entryCount: 0 };
    const sources: Record<string, typeof emptySource> = {
      FROM_STOCK: { ...emptySource },
      DIRECT_PURCHASE: { ...emptySource },
    };
    for (const row of bySource) {
      sources[row.source] = {
        totalLiters: round2(Number(row._sum.quantityLiters || 0)),
        totalCost: round2(Number(row._sum.totalAmount || 0)),
        entryCount: row._count._all,
      };
    }

    return {
      ...summarizeAggregate(agg),
      fromStock: sources.FROM_STOCK,
      directPurchase: sources.DIRECT_PURCHASE,
      lastEntry: latest?.entryDate ?? null,
      from: range.from ?? null,
      to: range.to ?? null,
    };
  },

  /** One truck's AdBlue consumption over an optional date range. */
  async vehicleSummary(vehicleId: string, query: Request['query'] = {}) {
    const vehicle = await adBlueEntryRepository.findVehicleById(vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    const summary = await adBlueEntryService.summary({ ...query, vehicleId });
    return { vehicleId, registrationNumber: vehicle.registrationNumber, ...summary };
  },

  /** Truck-wise AdBlue consumption, both sources together — the table under the headline figures. */
  async vehicleConsumption(query: Request['query']) {
    const range = parseEntryDateRange(query);
    const { grouped, vehicles } = await adBlueEntryRepository.vehicleConsumptionAggregate(range);
    const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

    const rows = grouped
      .map((g) => ({
        vehicleId: g.vehicleId,
        registrationNumber: vehicleById.get(g.vehicleId)?.registrationNumber ?? 'Deleted vehicle',
        totalLiters: round2(Number(g._sum.quantityLiters || 0)),
        totalCost: round2(Number(g._sum.totalAmount || 0)),
        entryCount: g._count._all,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    return { data: rows, from: range.from ?? null, to: range.to ?? null };
  },
};
