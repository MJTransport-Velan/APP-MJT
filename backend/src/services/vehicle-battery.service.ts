import { Request } from 'express';
import { vehicleBatteryRepository, VehicleBatteryWithRelations } from '../repositories/vehicle-battery.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { vehicleExpenseInternalService } from './vehicle-expense.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { InstallBatteryInput } from '../validators/vehicle-battery.validator';

function serialize(b: VehicleBatteryWithRelations) {
  return {
    id: b.id,
    vehicle: { id: b.vehicle.id, registrationNumber: b.vehicle.registrationNumber },
    brand: b.brand,
    serialNumber: b.serialNumber,
    installedDate: b.installedDate,
    installedOdometer: b.installedOdometer,
    warrantyMonths: b.warrantyMonths,
    warrantyExpiryDate: b.warrantyExpiryDate,
    replacedDate: b.replacedDate,
    status: b.status,
    cost: b.cost,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export const vehicleBatteryService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await vehicleBatteryRepository.findManyPaginated({
      skip,
      take,
      vehicleId: (query.vehicleId as string) || undefined,
      status: (query.status as never) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const b = await vehicleBatteryRepository.findById(id);
    if (!b) throw new AppError('Vehicle Battery not found', 404);
    return serialize(b);
  },

  /** If this battery replaces an existing one, the prior record is marked REPLACED first (design doc §5). */
  async install(input: InstallBatteryInput, actorId: string) {
    if (input.replacesBatteryId) {
      const prior = await vehicleBatteryRepository.findById(input.replacesBatteryId);
      if (prior && prior.status === 'INSTALLED') {
        await vehicleBatteryRepository.update(prior.id, { status: 'REPLACED', replacedDate: new Date(), updatedById: actorId });
      }
    }

    const warrantyExpiryDate = input.warrantyMonths
      ? new Date(new Date(input.installedDate ?? Date.now()).setMonth(new Date(input.installedDate ?? Date.now()).getMonth() + input.warrantyMonths))
      : undefined;

    const battery = await vehicleBatteryRepository.create({
      vehicleId: input.vehicleId,
      brand: input.brand,
      serialNumber: input.serialNumber,
      installedDate: new Date(input.installedDate ?? Date.now()),
      installedOdometer: input.installedOdometer,
      warrantyMonths: input.warrantyMonths,
      warrantyExpiryDate,
      cost: input.cost,
      createdById: actorId,
      updatedById: actorId,
    });

    if (input.cost) {
      await vehicleExpenseInternalService.logFromSource({
        vehicleId: input.vehicleId,
        category: 'BATTERY',
        amount: input.cost,
        expenseDate: new Date(input.installedDate ?? Date.now()),
        description: `Battery installed — ${input.brand}`,
        referenceType: 'VEHICLE_BATTERY',
        referenceId: battery.id,
        actorId,
      });
    }

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'VehicleBattery', entityId: battery.id, description: `Installed battery (${input.brand}) on vehicle` });
    return vehicleBatteryService.getById(battery.id);
  },

  async dispose(id: string, actorId: string) {
    const existing = await vehicleBatteryRepository.findById(id);
    if (!existing) throw new AppError('Vehicle Battery not found', 404);
    if (existing.status === 'DISPOSED') throw new AppError('Battery is already disposed', 409);

    await vehicleBatteryRepository.update(id, { status: 'DISPOSED', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleBattery', entityId: id, description: `Disposed battery` });
    return vehicleBatteryService.getById(id);
  },
};
