import { Request } from 'express';
import { vehicleRepository, VehicleWithRelations } from '../repositories/vehicle.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { forcedVehicleOwnership, assertVehicleAccess } from '../utils/vehicleAccess';
import { CreateVehicleInput, UpdateVehicleInput } from '../validators/vehicle.validator';

function serialize(vehicle: VehicleWithRelations) {
  return {
    id: vehicle.id,
    registrationNumber: vehicle.registrationNumber,
    ownership: vehicle.ownership,
    manufacturer: vehicle.manufacturer,
    model: vehicle.model,
    capacityTon: vehicle.capacityTon,
    rcDocument: vehicle.rcDocument,
    insuranceDocument: vehicle.insuranceDocument,
    permitDocument: vehicle.permitDocument,
    isActive: vehicle.isActive,
    vehicleType: { id: vehicle.vehicleType.id, name: vehicle.vehicleType.name, code: vehicle.vehicleType.code },
    supplier: vehicle.supplier ? { id: vehicle.supplier.id, name: vehicle.supplier.name } : null,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  };
}

export const vehicleService = {
  async list(query: Request['query'], roles: string[] = []) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const vehicleTypeId = (query.vehicleTypeId as string) || undefined;
    const supplierId = (query.supplierId as string) || undefined;
    // Fleet operators are locked to their own ownership regardless of what
    // the client passes; managers/admins may filter freely (or see both).
    const ownership = forcedVehicleOwnership(roles) || (query.ownership as 'OWN' | 'MARKET') || undefined;
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const { rows, total } = await vehicleRepository.findManyPaginated({
      skip,
      take,
      search,
      vehicleTypeId,
      supplierId,
      ownership,
      isActive,
    });

    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string, roles: string[] = []) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    assertVehicleAccess(vehicle.ownership, roles);
    return serialize(vehicle);
  },

  async create(input: CreateVehicleInput, actorId: string) {
    const regTaken = await vehicleRepository.findByRegistrationNumber(input.registrationNumber);
    if (regTaken) {
      throw new AppError('A vehicle with this registration number already exists', 409);
    }

    const vehicleType = await vehicleRepository.findVehicleTypeById(input.vehicleTypeId);
    if (!vehicleType) {
      throw new AppError('Vehicle type not found', 404);
    }

    if (input.ownership === 'MARKET' && !input.supplierId) {
      throw new AppError('A supplier is required for market fleet vehicles', 400);
    }

    if (input.supplierId) {
      const supplier = await vehicleRepository.findSupplierById(input.supplierId);
      if (!supplier) {
        throw new AppError('Supplier not found', 404);
      }
    }

    const vehicle = await vehicleRepository.create({ ...input, createdById: actorId, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      description: `Created vehicle ${vehicle.registrationNumber}`,
    });

    return vehicleService.getById(vehicle.id);
  },

  async update(id: string, input: UpdateVehicleInput, actorId: string) {
    const existing = await vehicleRepository.findById(id);
    if (!existing) {
      throw new AppError('Vehicle not found', 404);
    }

    if (input.vehicleTypeId) {
      const vehicleType = await vehicleRepository.findVehicleTypeById(input.vehicleTypeId);
      if (!vehicleType) throw new AppError('Vehicle type not found', 404);
    }

    if (input.supplierId) {
      const supplier = await vehicleRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);
    }

    await vehicleRepository.update(id, { ...input, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Vehicle',
      entityId: id,
      description: `Updated vehicle ${existing.registrationNumber}`,
    });

    return vehicleService.getById(id);
  },

  async setDocuments(
    id: string,
    files: { rcDocument?: string; insuranceDocument?: string; permitDocument?: string },
    actorId: string
  ) {
    const existing = await vehicleRepository.findById(id);
    if (!existing) {
      throw new AppError('Vehicle not found', 404);
    }

    await vehicleRepository.setDocuments(id, files, actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Vehicle',
      entityId: id,
      description: `Updated documents for vehicle ${existing.registrationNumber}`,
    });

    return vehicleService.getById(id);
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await vehicleRepository.findById(id);
    if (!existing) {
      throw new AppError('Vehicle not found', 404);
    }

    const updated = await vehicleRepository.toggleStatus(id, !existing.isActive, actorId);

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Vehicle',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} vehicle ${existing.registrationNumber}`,
    });

    return vehicleService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await vehicleRepository.findById(id);
    if (!existing) {
      throw new AppError('Vehicle not found', 404);
    }

    await vehicleRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Vehicle',
      entityId: id,
      description: `Deleted vehicle ${existing.registrationNumber}`,
    });
  },
};
