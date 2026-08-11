import { Request } from 'express';
import { SparePartUsageType } from '@prisma/client';
import {
  sparePartUsageRepository,
  SparePartUsageWithRelations,
} from '../repositories/spare-part-usage.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateUsageInput } from '../validators/spare-part-usage.validator';

function serialize(usage: SparePartUsageWithRelations) {
  return {
    id: usage.id,
    type: usage.type,
    quantity: usage.quantity,
    usageDate: usage.usageDate,
    notes: usage.notes,
    vehicle: { id: usage.vehicle.id, registrationNumber: usage.vehicle.registrationNumber },
    sparePart: { id: usage.sparePart.id, name: usage.sparePart.name, code: usage.sparePart.code },
    maintenanceRecord: usage.maintenanceRecord ? { id: usage.maintenanceRecord.id, type: usage.maintenanceRecord.type } : null,
    createdAt: usage.createdAt,
  };
}

export const sparePartUsageService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const vehicleId = (query.vehicleId as string) || undefined;
    const sparePartId = (query.sparePartId as string) || undefined;
    const type = (query.type as SparePartUsageType) || undefined;

    const { rows, total } = await sparePartUsageRepository.findManyPaginated({
      skip,
      take,
      vehicleId,
      sparePartId,
      type,
    });

    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const usage = await sparePartUsageRepository.findById(id);
    if (!usage) {
      throw new AppError('Spare part usage record not found', 404);
    }
    return serialize(usage);
  },

  async create(input: CreateUsageInput, actorId: string) {
    const vehicle = await sparePartUsageRepository.findVehicleById(input.vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const sparePart = await sparePartUsageRepository.findSparePartById(input.sparePartId);
    if (!sparePart) {
      throw new AppError('Spare part not found', 404);
    }

    let usage;
    try {
      usage = await sparePartUsageRepository.createWithStockMovement({
        vehicleId: input.vehicleId,
        sparePartId: input.sparePartId,
        maintenanceRecordId: input.maintenanceRecordId,
        type: input.type,
        quantity: input.quantity,
        usageDate: input.usageDate ? new Date(input.usageDate) : new Date(),
        notes: input.notes,
        createdById: actorId,
        updatedById: actorId,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_STOCK') {
        throw new AppError(`Insufficient stock for "${sparePart.name}" — only ${sparePart.stockQuantity} available`, 400);
      }
      throw err;
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'SparePartUsage',
      entityId: usage.id,
      description: `${input.type} ${input.quantity} x ${sparePart.name} for vehicle ${vehicle.registrationNumber}`,
    });

    return sparePartUsageService.getById(usage.id);
  },
};
