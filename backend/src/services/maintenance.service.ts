import { Request } from 'express';
import { MaintenanceType, MaintenanceStatus } from '@prisma/client';
import { maintenanceRepository, MaintenanceWithRelations } from '../repositories/maintenance.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { vehicleExpenseInternalService } from './vehicle-expense.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateMaintenanceInput, UpdateMaintenanceInput } from '../validators/maintenance.validator';

function serialize(record: MaintenanceWithRelations) {
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    description: record.description,
    serviceDate: record.serviceDate,
    cost: record.cost,
    odometerReading: record.odometerReading,
    nextServiceDueDate: record.nextServiceDueDate,
    nextServiceDueOdometer: record.nextServiceDueOdometer,
    billDocument: record.billDocument,
    accidentPhoto: record.accidentPhoto,
    vehicle: { id: record.vehicle.id, registrationNumber: record.vehicle.registrationNumber },
    serviceCategory: record.serviceCategory ? { id: record.serviceCategory.id, name: record.serviceCategory.name } : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const maintenanceService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const vehicleId = (query.vehicleId as string) || undefined;
    const type = (query.type as MaintenanceType) || undefined;
    const status = (query.status as MaintenanceStatus) || undefined;

    const { rows, total } = await maintenanceRepository.findManyPaginated({ skip, take, vehicleId, type, status });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const record = await maintenanceRepository.findById(id);
    if (!record) {
      throw new AppError('Maintenance record not found', 404);
    }
    return serialize(record);
  },

  async upcomingDue() {
    const records = await maintenanceRepository.findUpcomingDue();
    // Keep only the single most-recent (soonest-due) record per vehicle.
    const seen = new Set<string>();
    const result = [];
    for (const record of records) {
      if (seen.has(record.vehicleId)) continue;
      seen.add(record.vehicleId);
      result.push(serialize(record));
    }
    return result;
  },

  async create(input: CreateMaintenanceInput, actorId: string) {
    const vehicle = await maintenanceRepository.findVehicleById(input.vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const record = await maintenanceRepository.create({
      vehicleId: input.vehicleId,
      type: input.type,
      serviceCategoryId: input.serviceCategoryId,
      description: input.description,
      serviceDate: input.serviceDate ? new Date(input.serviceDate) : new Date(),
      cost: input.cost,
      odometerReading: input.odometerReading,
      nextServiceDueDate: input.nextServiceDueDate ? new Date(input.nextServiceDueDate) : undefined,
      nextServiceDueOdometer: input.nextServiceDueOdometer,
      createdById: actorId,
      updatedById: actorId,
    });

    // A vehicle under active repair/breakdown is not available for assignment.
    if (input.type === 'REPAIR' || input.type === 'BREAKDOWN' || input.type === 'ACCIDENT') {
      await maintenanceRepository.setVehicleStatus(input.vehicleId, 'UNDER_MAINTENANCE', actorId);
    }

    if (input.cost && input.cost > 0) {
      await vehicleExpenseInternalService.logFromSource({
        vehicleId: input.vehicleId,
        category: 'MAINTENANCE',
        amount: input.cost,
        expenseDate: record.serviceDate,
        description: `${input.type}: ${input.description}`,
        referenceType: 'MaintenanceRecord',
        referenceId: record.id,
        actorId,
      });
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'MaintenanceRecord',
      entityId: record.id,
      description: `Recorded ${input.type} for vehicle ${vehicle.registrationNumber}`,
    });

    return maintenanceService.getById(record.id);
  },

  async update(id: string, input: UpdateMaintenanceInput, actorId: string) {
    const existing = await maintenanceRepository.findById(id);
    if (!existing) {
      throw new AppError('Maintenance record not found', 404);
    }

    await maintenanceRepository.update(id, {
      serviceCategoryId: input.serviceCategoryId,
      description: input.description,
      serviceDate: input.serviceDate ? new Date(input.serviceDate) : undefined,
      cost: input.cost,
      odometerReading: input.odometerReading,
      nextServiceDueDate: input.nextServiceDueDate ? new Date(input.nextServiceDueDate) : undefined,
      nextServiceDueOdometer: input.nextServiceDueOdometer,
      status: input.status,
      updatedById: actorId,
    });

    if (input.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await maintenanceRepository.setVehicleStatus(existing.vehicleId, 'AVAILABLE', actorId);
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'MaintenanceRecord',
      entityId: id,
      description: `Updated maintenance record for vehicle ${existing.vehicle.registrationNumber}`,
    });

    return maintenanceService.getById(id);
  },

  async setAttachment(id: string, field: 'billDocument' | 'accidentPhoto', filePath: string, actorId: string) {
    const existing = await maintenanceRepository.findById(id);
    if (!existing) {
      throw new AppError('Maintenance record not found', 404);
    }

    await maintenanceRepository.setAttachment(id, field, filePath, actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'MaintenanceRecord',
      entityId: id,
      description: `Uploaded ${field} for maintenance record on vehicle ${existing.vehicle.registrationNumber}`,
    });

    return maintenanceService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await maintenanceRepository.findById(id);
    if (!existing) {
      throw new AppError('Maintenance record not found', 404);
    }

    await maintenanceRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'MaintenanceRecord',
      entityId: id,
      description: `Deleted maintenance record for vehicle ${existing.vehicle.registrationNumber}`,
    });
  },
};
