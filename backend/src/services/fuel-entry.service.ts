import { Request } from 'express';
import ExcelJS from 'exceljs';
import { fuelEntryRepository, FuelEntryWithRelations } from '../repositories/fuel-entry.repository';
import { tripRepository } from '../repositories/trip.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { vehicleExpenseInternalService } from './vehicle-expense.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateFuelEntryInput, UpdateFuelEntryInput } from '../validators/fuel-entry.validator';

const round2 = (value: number) => Number(value.toFixed(2));

const toNumber = (value: unknown) => (value == null ? undefined : Number(value));

/**
 * Quantity, rate and amount are three views of the same fill, and an
 * operator rarely has all three: a roadside cash fill is "2000 paid", a
 * fuel card slip is "80 L", a proper invoice is "80 L at 94.50". Whichever
 * two are known determine the third; whatever stays unknown is stored null
 * rather than invented.
 *
 * The amount is authoritative when given -- it is the money that actually
 * left the account -- so the rate is derived from it. Only when no amount
 * is supplied is one computed as quantity x rate. All three supplied are
 * stored exactly as typed, since the operator is copying a real bill.
 */
function resolveFuelFigures(input: { quantityLiters?: number; ratePerLiter?: number; totalAmount?: number }) {
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
 * midnight); `to` is pushed to the end of its day so the whole day counts,
 * matching how the fuel entry list already reads its filters.
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

type FuelAggregate = {
  _sum: { quantityLiters: unknown; totalAmount: unknown; distanceCovered: unknown };
  _avg: { ratePerLiter: unknown; mileageKmpl: unknown };
  _count: { _all: number };
};

/** The figures every fuel dashboard shows, derived from one Prisma aggregate. */
function summarizeAggregate(agg: FuelAggregate) {
  const totalLiters = Number(agg._sum.quantityLiters || 0);
  const totalFuelCost = Number(agg._sum.totalAmount || 0);
  const totalKM = Number(agg._sum.distanceCovered || 0);
  const costPerKm = totalKM > 0 ? round2(totalFuelCost / totalKM) : null;
  return {
    totalLiters,
    totalFuelCost,
    avgRate: agg._avg.ratePerLiter != null ? Number(agg._avg.ratePerLiter) : null,
    totalKM,
    mileageKmpl: agg._avg.mileageKmpl != null ? round2(Number(agg._avg.mileageKmpl)) : null,
    costPerKm,
    fuelCostPerKm: costPerKm,
    entryCount: agg._count._all,
  };
}

/** How a fill reads in audit trails and mirrored expense rows, given either figure may be unknown. */
function describeFill(figures: { quantityLiters: number | null; totalAmount: number | null }) {
  if (figures.quantityLiters != null) return `${figures.quantityLiters}L`;
  if (figures.totalAmount != null) return `${figures.totalAmount}`;
  return 'quantity not recorded';
}

function serialize(entry: FuelEntryWithRelations) {
  return {
    id: entry.id,
    fuelType: entry.fuelType,
    billingMethod: entry.billingMethod,
    location: entry.location,
    quantityLiters: entry.quantityLiters,
    ratePerLiter: entry.ratePerLiter,
    totalAmount: entry.totalAmount,
    odometerReading: entry.odometerReading,
    distanceCovered: entry.distanceCovered,
    mileageKmpl: entry.mileageKmpl,
    invoiceNumber: entry.invoiceNumber,
    referenceNumber: entry.referenceNumber,
    remarks: entry.remarks,
    entryDate: entry.entryDate,
    billDocument: entry.billDocument,
    vehicle: { id: entry.vehicle.id, registrationNumber: entry.vehicle.registrationNumber },
    fuelCard: entry.fuelCard ? { id: entry.fuelCard.id, cardNumber: entry.fuelCard.cardNumber } : null,
    trip: entry.trip ? { id: entry.trip.id, tripNumber: entry.trip.tripNumber } : null,
    driver: entry.driver ? { id: entry.driver.id, name: entry.driver.name, code: entry.driver.code } : null,
    supplier: entry.supplier ? { id: entry.supplier.id, name: entry.supplier.name } : null,
    paymentMode: entry.paymentMode ? { id: entry.paymentMode.id, name: entry.paymentMode.name } : null,
    advance: entry.advance ? { id: entry.advance.id, advanceNumber: entry.advance.advanceNumber, amount: entry.advance.amount } : null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export const fuelEntryService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    // "to" arrives as a date-only string (YYYY-MM-DD, parsed as UTC
    // midnight) — push it to the end of that day so the whole day is
    // included, not just the single instant at 00:00:00.000.
    let to: Date | undefined;
    if (query.to) {
      to = new Date(query.to as string);
      to.setUTCHours(23, 59, 59, 999);
    }
    const { rows, total } = await fuelEntryRepository.findManyPaginated({
      skip,
      take,
      vehicleId: (query.vehicleId as string) || undefined,
      tripId: (query.tripId as string) || undefined,
      driverId: (query.driverId as string) || undefined,
      fuelType: (query.fuelType as string) || undefined,
      billingMethod: (query.billingMethod as string) || undefined,
      from: query.from ? new Date(query.from as string) : undefined,
      to,
    });

    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const entry = await fuelEntryRepository.findById(id);
    if (!entry) {
      throw new AppError('Fuel entry not found', 404);
    }
    return serialize(entry);
  },

  async create(input: CreateFuelEntryInput, actorId: string) {
    const vehicle = await fuelEntryRepository.findVehicleById(input.vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    if (input.supplierId) {
      const supplier = await fuelEntryRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);
    }
    if (input.advanceId) {
      const advance = await fuelEntryRepository.findAdvanceById(input.advanceId);
      if (!advance) throw new AppError('Fuel advance not found', 404);
    }

    const entryDate = input.entryDate ? new Date(input.entryDate) : new Date();
    if (Number.isNaN(entryDate.getTime())) {
      throw new AppError('Invalid fuel entry date', 400);
    }

    // Trip isn't picked manually — it's derived from whichever trip this
    // vehicle was actually running at the entry's date, unless the caller
    // explicitly named one. Driver is never picked manually at all — it
    // always comes from that trip's assigned driver.
    let tripId = input.tripId;
    let driverId: string | undefined;
    if (tripId) {
      const trip = await fuelEntryRepository.findTripById(tripId);
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

    const figures = resolveFuelFigures(input);

    // Mileage calculation: derive distance/kmpl relative to the vehicle's
    // most recent prior fuel entry, if one exists. Distance stands on its
    // own when the litres are unknown -- only km/l needs them.
    const previousEntry = await fuelEntryRepository.findPreviousEntry(input.vehicleId, entryDate);
    let distanceCovered: number | undefined;
    let mileageKmpl: number | undefined;

    if (previousEntry) {
      if (input.odometerReading <= previousEntry.odometerReading) {
        throw new AppError('Meter reading must be greater than the previous fuel entry reading', 400);
      }
      distanceCovered = input.odometerReading - previousEntry.odometerReading;
      if (figures.quantityLiters != null) {
        mileageKmpl = round2(distanceCovered / figures.quantityLiters);
      }
    }

    const entry = await fuelEntryRepository.create({
      vehicleId: input.vehicleId,
      fuelCardId: input.fuelCardId,
      fuelType: input.fuelType,
      billingMethod: input.billingMethod,
      location: input.location,
      tripId,
      driverId,
      supplierId: input.supplierId,
      paymentModeId: input.paymentModeId,
      advanceId: input.advanceId,
      quantityLiters: figures.quantityLiters,
      ratePerLiter: figures.ratePerLiter,
      totalAmount: figures.totalAmount,
      odometerReading: input.odometerReading,
      distanceCovered,
      mileageKmpl,
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
      entityType: 'FuelEntry',
      entityId: entry.id,
      description: `Recorded fuel entry for vehicle ${vehicle.registrationNumber} (${describeFill(figures)})`,
    });

    // Nothing to mirror into vehicle expenses until the fill has a cost -- a
    // litres-only entry gets its expense row when an amount is filled in
    // later (see update below).
    if (figures.totalAmount != null) {
      await vehicleExpenseInternalService.logFromSource({
        vehicleId: input.vehicleId,
        tripId,
        category: 'FUEL',
        amount: figures.totalAmount,
        expenseDate: entryDate,
        description: `Fuel: ${describeFill(figures)}`,
        referenceType: 'FuelEntry',
        referenceId: entry.id,
        actorId,
      });
    }

    return fuelEntryService.getById(entry.id);
  },

  async update(id: string, input: UpdateFuelEntryInput, actorId: string) {
    const existing = await fuelEntryRepository.findById(id);
    if (!existing) {
      throw new AppError('Fuel entry not found', 404);
    }

    if (input.supplierId) {
      const supplier = await fuelEntryRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);
    }

    // Whichever figure the caller just sent is the one to believe: a new
    // amount re-derives the rate, new litres/rate re-derive the amount.
    // Untouched figures fall back to what is already stored.
    const figures = resolveFuelFigures({
      quantityLiters: input.quantityLiters ?? toNumber(existing.quantityLiters),
      ratePerLiter: input.ratePerLiter ?? (input.totalAmount != null ? undefined : toNumber(existing.ratePerLiter)),
      totalAmount:
        input.totalAmount ??
        (input.quantityLiters != null || input.ratePerLiter != null ? undefined : toNumber(existing.totalAmount)),
    });
    const entryDate = input.entryDate ? new Date(input.entryDate) : existing.entryDate;

    // Trip/driver are only touched when the caller explicitly names a trip,
    // or changes the date (which may put the vehicle on a different trip —
    // or no trip at all, in which case both clear back to null). Driver is
    // never picked manually — it always follows whichever trip is resolved.
    let tripId: string | undefined = input.tripId;
    let driverId: string | undefined;
    let tripTouched = false;
    if (input.tripId) {
      const trip = await fuelEntryRepository.findTripById(input.tripId);
      if (!trip) throw new AppError('Trip not found', 404);
      if (trip.vehicleId !== existing.vehicleId) {
        throw new AppError('The selected trip is not assigned to this fuel entry\'s vehicle', 422);
      }
      driverId = trip.driverId ?? undefined;
      tripTouched = true;
    } else if (input.entryDate) {
      const activeTrip = await tripRepository.findActiveTripForVehicleOnDate(existing.vehicleId, entryDate);
      tripId = activeTrip?.id;
      driverId = activeTrip?.driverId ?? undefined;
      tripTouched = true;
    }

    await fuelEntryRepository.update(id, {
      fuelType: input.fuelType,
      billingMethod: input.billingMethod,
      location: input.location,
      tripId: tripTouched ? (tripId ?? null) : undefined,
      driverId: tripTouched ? (driverId ?? null) : undefined,
      supplierId: input.supplierId,
      paymentModeId: input.paymentModeId,
      advanceId: input.advanceId,
      quantityLiters: figures.quantityLiters,
      ratePerLiter: figures.ratePerLiter,
      totalAmount: figures.totalAmount,
      invoiceNumber: input.invoiceNumber,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      entryDate: input.entryDate ? entryDate : undefined,
      updatedById: actorId,
    });

    // An entry recorded without a cost has no mirrored expense row yet, and
    // updateFromSource no-ops on a missing mirror -- so once an amount lands,
    // that row has to be created rather than updated.
    if (figures.totalAmount != null && existing.totalAmount == null) {
      await vehicleExpenseInternalService.logFromSource({
        vehicleId: existing.vehicleId,
        tripId: tripTouched ? tripId : (existing.tripId ?? undefined),
        category: 'FUEL',
        amount: figures.totalAmount,
        expenseDate: entryDate,
        description: `Fuel: ${describeFill(figures)}`,
        referenceType: 'FuelEntry',
        referenceId: id,
        actorId,
      });
    } else if (figures.totalAmount != null) {
      await vehicleExpenseInternalService.updateFromSource({
        referenceType: 'FuelEntry',
        referenceId: id,
        tripId: tripTouched ? (tripId ?? null) : undefined,
        amount: figures.totalAmount,
        expenseDate: input.entryDate ? entryDate : undefined,
        description: `Fuel: ${describeFill(figures)}`,
        actorId,
      });
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'FuelEntry',
      entityId: id,
      description: `Updated fuel entry for vehicle ${existing.vehicle.registrationNumber}`,
    });

    return fuelEntryService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await fuelEntryRepository.findById(id);
    if (!existing) {
      throw new AppError('Fuel entry not found', 404);
    }

    await fuelEntryRepository.softDelete(id, actorId);
    await vehicleExpenseInternalService.removeFromSource({ referenceType: 'FuelEntry', referenceId: id, actorId });

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'FuelEntry',
      entityId: id,
      description: `Deleted fuel entry for vehicle ${existing.vehicle.registrationNumber}`,
    });
  },

  async setBillDocument(id: string, filePath: string, actorId: string) {
    const existing = await fuelEntryRepository.findById(id);
    if (!existing) throw new AppError('Fuel entry not found', 404);
    await fuelEntryRepository.update(id, { billDocument: filePath, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'FuelEntry', entityId: id, description: 'Uploaded fuel bill document' });
    return fuelEntryService.getById(id);
  },

  /** Vehicle Fuel Tracking dashboard: totals, average rate, mileage and cost-per-km for one vehicle, over an optional date range. */
  async vehicleFuelSummary(vehicleId: string, query: Request['query'] = {}) {
    const vehicle = await fuelEntryRepository.findVehicleById(vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    const range = parseEntryDateRange(query);
    const { agg, latest } = await fuelEntryRepository.fuelAggregate({ vehicleId, ...range });

    return {
      vehicleId,
      registrationNumber: vehicle.registrationNumber,
      ...summarizeAggregate(agg),
      lastFuelEntry: latest?.entryDate ?? null,
      currentOdometer: latest?.odometerReading ?? null,
      from: range.from ?? null,
      to: range.to ?? null,
    };
  },

  /** The Mileage & Consumption tab's headline figures — the same shape as the per-vehicle summary, across every vehicle in the range. */
  async fuelSummary(query: Request['query']) {
    const range = parseEntryDateRange(query);
    const { agg, latest } = await fuelEntryRepository.fuelAggregate({
      vehicleId: (query.vehicleId as string) || undefined,
      ...range,
    });

    return {
      ...summarizeAggregate(agg),
      lastFuelEntry: latest?.entryDate ?? null,
      from: range.from ?? null,
      to: range.to ?? null,
    };
  },

  /**
   * Driver-wise mileage: what each driver burnt, covered and cost over the
   * range. Mileage is the average of the per-fill km/l figures, the same
   * measure the vehicle summary reports, so the two read alike; fills whose
   * litres were never recorded simply carry no km/l and sit out of it.
   */
  async driverMileage(query: Request['query']) {
    const range = parseEntryDateRange(query);
    const { grouped, drivers } = await fuelEntryRepository.driverMileageAggregate({
      driverId: (query.driverId as string) || undefined,
      ...range,
    });
    const driverById = new Map(drivers.map((d) => [d.id, d]));

    const rows = grouped.map((g) => {
      const driver = g.driverId ? driverById.get(g.driverId) : undefined;
      return {
        driverId: g.driverId,
        driverName: driver?.name ?? 'Unknown driver',
        driverCode: driver?.code ?? null,
        ...summarizeAggregate(g),
      };
    });

    rows.sort((a, b) => b.totalFuelCost - a.totalFuelCost);
    return { data: rows, from: range.from ?? null, to: range.to ?? null };
  },

  /** Fuel Advance vs Fuel Payment: how much of a driver's fuel advance has actually been drawn down by fuel purchases. */
  async advanceBalance(advanceId: string) {
    const advance = await fuelEntryRepository.findAdvanceById(advanceId);
    if (!advance) throw new AppError('Fuel advance not found', 404);
    const used = await fuelEntryRepository.advanceFuelUsageTotal(advanceId);
    const fuelUsed = Number(used._sum.totalAmount || 0);
    return {
      advanceId,
      advanceNumber: advance.advanceNumber,
      advanceAmount: Number(advance.amount),
      fuelUsed,
      remaining: Number((Number(advance.amount) - fuelUsed).toFixed(2)),
    };
  },

  /** Downloadable .xlsx template matching exactly what importFuelEntryRow (import.service.ts) expects — column names and example rows, so a user filling it in by hand doesn't have to guess. */
  async generateSampleTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Fuel Entries');
    const columns = [
      'vehicleRegistrationNumber', 'quantityLiters', 'ratePerLiter', 'totalAmount', 'odometerReading',
      'entryDate', 'tripNumber', 'fuelType', 'billingMethod', 'invoiceNumber', 'referenceNumber', 'remarks',
    ];
    sheet.addRow(columns);
    sheet.getRow(1).font = { bold: true };
    sheet.addRow(['TN38AZ1001', 150, 94.5, '', 51200, '2026-08-10', '', 'DIESEL', 'FUEL_CARD', 'INV-1001', 'REF-1001', 'Example row — litres and rate; the amount is calculated']);
    sheet.addRow(['TN38AZ1002', 40, '', '', 30500, '2026-08-10', '', 'DIESEL', 'DIRECT_PAYMENT', '', '', 'Example row — litres only, rate unknown']);
    sheet.addRow(['TN38AZ1003', '', '', 2000, 30800, '2026-08-10', '', 'DIESEL', 'DIRECT_PAYMENT', '', '', 'Example row — a flat ₹2,000 cash fill; litres not on the slip']);
    sheet.columns.forEach((col) => { col.width = 22; });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },
};
