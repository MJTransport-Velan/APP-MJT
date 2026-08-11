import { Request } from 'express';
import ExcelJS from 'exceljs';
import { fuelEntryRepository, FuelEntryWithRelations } from '../repositories/fuel-entry.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { vehicleExpenseInternalService } from './vehicle-expense.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateFuelEntryInput, UpdateFuelEntryInput } from '../validators/fuel-entry.validator';

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
    isAnomaly: entry.isAnomaly,
    anomalyReasons: entry.anomalyReasons,
    entryDate: entry.entryDate,
    billDocument: entry.billDocument,
    vehicle: { id: entry.vehicle.id, registrationNumber: entry.vehicle.registrationNumber },
    fuelStation: entry.fuelStation ? { id: entry.fuelStation.id, name: entry.fuelStation.name } : null,
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

const FREQUENT_ENTRY_WINDOW_HOURS = 6;
const HIGH_QUANTITY_RATIO = 1.5;
const LOW_MILEAGE_RATIO = 0.5;
const LARGE_DISTANCE_JUMP_KM = 3000;

/** Best-effort anomaly checks — none of these hard-block a save, they only flag the entry for review (except vehicle/trip/odometer integrity checks, which remain hard 400s in create()/update()). */
async function detectAnomalies(params: {
  vehicleId: string;
  entryDate: Date;
  quantityLiters: number;
  mileageKmpl?: number;
  distanceCovered?: number;
  tripStatus?: string;
  excludeId?: string;
}): Promise<string[]> {
  const reasons: string[] = [];

  const duplicate = await fuelEntryRepository.findPossibleDuplicate(params.vehicleId, params.entryDate, params.quantityLiters, params.excludeId);
  if (duplicate) reasons.push('Possible duplicate entry (same vehicle, date and quantity)');

  const recent = await fuelEntryRepository.recentEntriesForVehicle(params.vehicleId, 5, params.excludeId);
  if (recent.length >= 2) {
    const avgQuantity = recent.reduce((sum, e) => sum + Number(e.quantityLiters), 0) / recent.length;
    if (avgQuantity > 0 && params.quantityLiters > avgQuantity * HIGH_QUANTITY_RATIO) {
      reasons.push('Fuel quantity unusually high compared to this vehicle\'s recent average');
    }
    const mileageSamples = recent.filter((e) => e.mileageKmpl != null).map((e) => Number(e.mileageKmpl));
    if (params.mileageKmpl != null && mileageSamples.length >= 2) {
      const avgMileage = mileageSamples.reduce((sum, v) => sum + v, 0) / mileageSamples.length;
      if (avgMileage > 0 && params.mileageKmpl < avgMileage * LOW_MILEAGE_RATIO) {
        reasons.push('Mileage unusually low compared to this vehicle\'s recent average');
      }
    }
  }

  if (params.distanceCovered != null && params.distanceCovered > LARGE_DISTANCE_JUMP_KM) {
    reasons.push('Unusually large distance covered since the previous fuel entry — check odometer reading');
  }

  const since = new Date(params.entryDate.getTime() - FREQUENT_ENTRY_WINDOW_HOURS * 60 * 60 * 1000);
  const frequentCount = await fuelEntryRepository.countEntriesSince(params.vehicleId, since, params.excludeId);
  if (frequentCount > 0) {
    reasons.push(`Another fuel entry for this vehicle exists within ${FREQUENT_ENTRY_WINDOW_HOURS} hours`);
  }

  if (params.tripStatus === 'COMPLETED' || params.tripStatus === 'CANCELLED') {
    reasons.push('Fuel entered against a trip that is already completed or cancelled');
  }

  return reasons;
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
      fuelStationId: (query.fuelStationId as string) || undefined,
      tripId: (query.tripId as string) || undefined,
      driverId: (query.driverId as string) || undefined,
      fuelType: (query.fuelType as string) || undefined,
      billingMethod: (query.billingMethod as string) || undefined,
      isAnomaly: query.isAnomaly === undefined ? undefined : query.isAnomaly === 'true',
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

    let fuelStation: Awaited<ReturnType<typeof fuelEntryRepository.findFuelStationById>> = null;
    if (input.fuelStationId) {
      fuelStation = await fuelEntryRepository.findFuelStationById(input.fuelStationId);
      if (!fuelStation) {
        throw new AppError('Fuel station not found', 404);
      }
    }

    let tripStatus: string | undefined;
    if (input.tripId) {
      const trip = await fuelEntryRepository.findTripById(input.tripId);
      if (!trip) throw new AppError('Trip not found', 404);
      if (trip.vehicleId !== input.vehicleId) {
        throw new AppError('The selected vehicle is not assigned to this trip', 422);
      }
      tripStatus = trip.status;
    }

    if (input.driverId) {
      const driver = await fuelEntryRepository.findDriverById(input.driverId);
      if (!driver) throw new AppError('Driver not found', 404);
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
    const totalAmount = Number((input.quantityLiters * input.ratePerLiter).toFixed(2));

    // Mileage calculation: derive distance/kmpl relative to the vehicle's
    // most recent prior fuel entry, if one exists.
    const previousEntry = await fuelEntryRepository.findPreviousEntry(input.vehicleId, entryDate);
    let distanceCovered: number | undefined;
    let mileageKmpl: number | undefined;

    if (previousEntry) {
      if (input.odometerReading <= previousEntry.odometerReading) {
        throw new AppError('Meter reading must be greater than the previous fuel entry reading', 400);
      }
      distanceCovered = input.odometerReading - previousEntry.odometerReading;
      mileageKmpl = Number((distanceCovered / input.quantityLiters).toFixed(2));
    }

    const anomalyReasons = await detectAnomalies({
      vehicleId: input.vehicleId,
      entryDate,
      quantityLiters: input.quantityLiters,
      mileageKmpl,
      distanceCovered,
      tripStatus,
    });

    const entry = await fuelEntryRepository.create({
      vehicleId: input.vehicleId,
      fuelCardId: input.fuelCardId,
      fuelStationId: input.fuelStationId,
      fuelType: input.fuelType,
      billingMethod: input.billingMethod,
      location: input.location,
      tripId: input.tripId,
      driverId: input.driverId,
      supplierId: input.supplierId,
      paymentModeId: input.paymentModeId,
      advanceId: input.advanceId,
      quantityLiters: input.quantityLiters,
      ratePerLiter: input.ratePerLiter,
      totalAmount,
      odometerReading: input.odometerReading,
      distanceCovered,
      mileageKmpl,
      invoiceNumber: input.invoiceNumber,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      isAnomaly: anomalyReasons.length > 0,
      anomalyReasons: anomalyReasons.length ? anomalyReasons.join('; ') : undefined,
      entryDate,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'FuelEntry',
      entityId: entry.id,
      description: `Recorded fuel entry for vehicle ${vehicle.registrationNumber} (${input.quantityLiters}L)`,
    });

    await vehicleExpenseInternalService.logFromSource({
      vehicleId: input.vehicleId,
      category: 'FUEL',
      amount: totalAmount,
      expenseDate: entryDate,
      description: fuelStation ? `Fuel: ${input.quantityLiters}L at ${fuelStation.name}` : `Fuel: ${input.quantityLiters}L`,
      referenceType: 'FuelEntry',
      referenceId: entry.id,
      actorId,
    });

    return fuelEntryService.getById(entry.id);
  },

  async update(id: string, input: UpdateFuelEntryInput, actorId: string) {
    const existing = await fuelEntryRepository.findById(id);
    if (!existing) {
      throw new AppError('Fuel entry not found', 404);
    }

    if (input.tripId) {
      const trip = await fuelEntryRepository.findTripById(input.tripId);
      if (!trip) throw new AppError('Trip not found', 404);
      if (trip.vehicleId !== existing.vehicleId) {
        throw new AppError('The selected trip is not assigned to this fuel entry\'s vehicle', 422);
      }
    }
    if (input.driverId) {
      const driver = await fuelEntryRepository.findDriverById(input.driverId);
      if (!driver) throw new AppError('Driver not found', 404);
    }
    if (input.supplierId) {
      const supplier = await fuelEntryRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);
    }

    const quantityLiters = input.quantityLiters ?? Number(existing.quantityLiters);
    const ratePerLiter = input.ratePerLiter ?? Number(existing.ratePerLiter);
    const totalAmount = Number((quantityLiters * ratePerLiter).toFixed(2));
    const entryDate = input.entryDate ? new Date(input.entryDate) : existing.entryDate;

    const anomalyReasons = await detectAnomalies({
      vehicleId: existing.vehicleId,
      entryDate,
      quantityLiters,
      mileageKmpl: existing.mileageKmpl != null ? Number(existing.mileageKmpl) : undefined,
      distanceCovered: existing.distanceCovered ?? undefined,
      excludeId: id,
    });

    await fuelEntryRepository.update(id, {
      fuelStationId: input.fuelStationId,
      fuelType: input.fuelType,
      billingMethod: input.billingMethod,
      location: input.location,
      tripId: input.tripId,
      driverId: input.driverId,
      supplierId: input.supplierId,
      paymentModeId: input.paymentModeId,
      advanceId: input.advanceId,
      quantityLiters: input.quantityLiters,
      ratePerLiter: input.ratePerLiter,
      totalAmount,
      invoiceNumber: input.invoiceNumber,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      isAnomaly: anomalyReasons.length > 0,
      anomalyReasons: anomalyReasons.length ? anomalyReasons.join('; ') : null,
      entryDate: input.entryDate ? entryDate : undefined,
      updatedById: actorId,
    });

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

  /** Vehicle Fuel Tracking dashboard: totals, average rate, mileage and cost-per-km for one vehicle. */
  async vehicleFuelSummary(vehicleId: string) {
    const vehicle = await fuelEntryRepository.findVehicleById(vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    const { agg, latest } = await fuelEntryRepository.vehicleAggregate(vehicleId);
    const totalLiters = Number(agg._sum.quantityLiters || 0);
    const totalFuelCost = Number(agg._sum.totalAmount || 0);
    const totalKM = Number(agg._sum.distanceCovered || 0);
    const avgRate = agg._avg.ratePerLiter != null ? Number(agg._avg.ratePerLiter) : null;
    const avgMileageKmpl = agg._avg.mileageKmpl != null ? Number(agg._avg.mileageKmpl) : null;
    const costPerKm = totalKM > 0 ? Number((totalFuelCost / totalKM).toFixed(2)) : null;

    return {
      vehicleId,
      registrationNumber: vehicle.registrationNumber,
      totalLiters,
      totalFuelCost,
      avgRate,
      totalKM,
      mileageKmpl: avgMileageKmpl,
      costPerKm,
      fuelCostPerKm: costPerKm,
      lastFuelEntry: latest?.entryDate ?? null,
      currentOdometer: latest?.odometerReading ?? null,
      entryCount: agg._count._all,
    };
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
      'vehicleRegistrationNumber', 'fuelStation', 'quantityLiters', 'ratePerLiter', 'odometerReading',
      'entryDate', 'tripNumber', 'driverCode', 'fuelType', 'billingMethod', 'invoiceNumber', 'referenceNumber', 'remarks',
    ];
    sheet.addRow(columns);
    sheet.getRow(1).font = { bold: true };
    sheet.addRow(['TN38AZ1001', 'Highway Fuels - Chennai Bypass', 150, 94.5, 51200, '2026-08-10', '', '', 'DIESEL', 'FUEL_CARD', 'INV-1001', 'REF-1001', 'Example row — fuelStation, trip, driver and billingMethod are all optional']);
    sheet.addRow(['TN38AZ1002', '', 40, 96, 30500, '2026-08-10', '', '', 'DIESEL', 'DIRECT_PAYMENT', '', '', 'Example row with no fuel station — direct cash payment at a roadside pump']);
    sheet.columns.forEach((col) => { col.width = 22; });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },
};
