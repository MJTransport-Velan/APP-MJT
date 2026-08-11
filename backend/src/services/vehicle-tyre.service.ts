import { Request } from 'express';
import { vehicleTyreRepository, VehicleTyreWithRelations } from '../repositories/vehicle-tyre.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { vehicleExpenseInternalService } from './vehicle-expense.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { InstallTyreInput, RotateTyreInput, RemoveTyreInput } from '../validators/vehicle-tyre.validator';

function serialize(t: VehicleTyreWithRelations) {
  return {
    id: t.id,
    tyre: { id: t.tyre.id, brand: t.tyre.brand, code: t.tyre.code, size: t.tyre.size },
    vehicle: t.vehicle ? { id: t.vehicle.id, registrationNumber: t.vehicle.registrationNumber } : null,
    serialNumber: t.serialNumber,
    position: t.position,
    installedDate: t.installedDate,
    installedOdometer: t.installedOdometer,
    removedDate: t.removedDate,
    removedOdometer: t.removedOdometer,
    status: t.status,
    cost: t.cost,
    movements: t.movements,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export const vehicleTyreService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await vehicleTyreRepository.findManyPaginated({
      skip,
      take,
      vehicleId: (query.vehicleId as string) || undefined,
      status: (query.status as never) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const t = await vehicleTyreRepository.findById(id);
    if (!t) throw new AppError('Vehicle Tyre not found', 404);
    return serialize(t);
  },

  /** Purchase + install in one step — mirrors its cost into VehicleExpense(TYRE), the same one-place-to-query pattern Fuel/Maintenance already established (design doc §4/§6.7). */
  async install(input: InstallTyreInput, actorId: string) {
    const tyre = await vehicleTyreRepository.create({
      tyreId: input.tyreId,
      vehicleId: input.vehicleId,
      serialNumber: input.serialNumber,
      position: input.position,
      installedDate: new Date(input.installedDate ?? Date.now()),
      installedOdometer: input.installedOdometer,
      cost: input.cost,
      createdById: actorId,
      updatedById: actorId,
    });

    await vehicleTyreRepository.createMovement({
      vehicleTyreId: tyre.id,
      movementType: 'INSTALL',
      toVehicleId: input.vehicleId,
      toPosition: input.position,
      odometerReading: input.installedOdometer,
      createdById: actorId,
    });

    if (input.cost && input.vehicleId) {
      await vehicleExpenseInternalService.logFromSource({
        vehicleId: input.vehicleId,
        category: 'TYRE',
        amount: input.cost,
        expenseDate: new Date(input.installedDate ?? Date.now()),
        description: `Tyre installed — ${input.position ?? ''}`.trim(),
        referenceType: 'VEHICLE_TYRE',
        referenceId: tyre.id,
        actorId,
      });
    }

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'VehicleTyre', entityId: tyre.id, description: `Installed tyre on vehicle` });
    return vehicleTyreService.getById(tyre.id);
  },

  async rotate(id: string, input: RotateTyreInput, actorId: string) {
    const existing = await vehicleTyreRepository.findById(id);
    if (!existing) throw new AppError('Vehicle Tyre not found', 404);
    if (existing.status !== 'INSTALLED') throw new AppError('Only an installed tyre can be rotated', 409);

    const fromVehicleId = existing.vehicleId;
    const fromPosition = existing.position;

    await vehicleTyreRepository.update(id, { vehicleId: input.toVehicleId ?? existing.vehicleId, position: input.toPosition });
    await vehicleTyreRepository.createMovement({
      vehicleTyreId: id,
      movementType: 'ROTATE',
      fromVehicleId,
      toVehicleId: input.toVehicleId ?? existing.vehicleId,
      fromPosition,
      toPosition: input.toPosition,
      odometerReading: input.odometerReading,
      createdById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleTyre', entityId: id, description: `Rotated tyre to ${input.toPosition ?? 'a new position'}` });
    return vehicleTyreService.getById(id);
  },

  async remove(id: string, input: RemoveTyreInput, actorId: string) {
    const existing = await vehicleTyreRepository.findById(id);
    if (!existing) throw new AppError('Vehicle Tyre not found', 404);
    if (existing.status !== 'INSTALLED') throw new AppError('Only an installed tyre can be removed', 409);

    await vehicleTyreRepository.update(id, {
      status: 'REMOVED',
      removedDate: new Date(input.removedDate ?? Date.now()),
      removedOdometer: input.removedOdometer,
      updatedById: actorId,
    });
    await vehicleTyreRepository.createMovement({
      vehicleTyreId: id,
      movementType: 'REMOVE',
      fromVehicleId: existing.vehicleId,
      fromPosition: existing.position,
      odometerReading: input.removedOdometer,
      createdById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleTyre', entityId: id, description: `Removed tyre from vehicle` });
    return vehicleTyreService.getById(id);
  },

  async scrap(id: string, actorId: string) {
    const existing = await vehicleTyreRepository.findById(id);
    if (!existing) throw new AppError('Vehicle Tyre not found', 404);
    if (existing.status === 'SCRAPPED') throw new AppError('Tyre is already scrapped', 409);

    await vehicleTyreRepository.update(id, { status: 'SCRAPPED', updatedById: actorId });
    await vehicleTyreRepository.createMovement({ vehicleTyreId: id, movementType: 'SCRAP', fromVehicleId: existing.vehicleId, fromPosition: existing.position, createdById: actorId });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleTyre', entityId: id, description: `Scrapped tyre` });
    return vehicleTyreService.getById(id);
  },
};
