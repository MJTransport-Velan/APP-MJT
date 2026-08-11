import { Request } from 'express';
import { driverRepository } from '../repositories/driver.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateDriverInput, UpdateDriverInput } from '../validators/driver.validator';

interface DriverRecord {
  id: string;
  name: string;
  code: string;
  licenseNumber: string;
  phone: string | null;
  licenseExpiryDate: Date | null;
  licenseDocument: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(driver: DriverRecord) {
  return {
    id: driver.id,
    name: driver.name,
    code: driver.code,
    licenseNumber: driver.licenseNumber,
    phone: driver.phone,
    licenseExpiryDate: driver.licenseExpiryDate,
    licenseDocument: driver.licenseDocument,
    isActive: driver.isActive,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  };
}

export const driverService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const { rows, total } = await driverRepository.findManyPaginated({ skip, take, search, isActive });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const driver = await driverRepository.findById(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }
    return serialize(driver);
  },

  async create(input: CreateDriverInput, actorId: string) {
    const codeTaken = await driverRepository.findByCode(input.code);
    if (codeTaken) {
      throw new AppError('Driver code already exists', 409);
    }

    const licenseTaken = await driverRepository.findByLicenseNumber(input.licenseNumber);
    if (licenseTaken) {
      throw new AppError('A driver with this license number already exists', 409);
    }

    const driver = await driverRepository.create({
      name: input.name,
      code: input.code,
      licenseNumber: input.licenseNumber,
      phone: input.phone,
      licenseExpiryDate: input.licenseExpiryDate ? new Date(input.licenseExpiryDate) : undefined,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Driver',
      entityId: driver.id,
      description: `Created driver ${driver.name}`,
    });

    return serialize(driver);
  },

  async update(id: string, input: UpdateDriverInput, actorId: string) {
    const existing = await driverRepository.findById(id);
    if (!existing) {
      throw new AppError('Driver not found', 404);
    }

    if (input.code && input.code !== existing.code) {
      const codeTaken = await driverRepository.findByCode(input.code);
      if (codeTaken) throw new AppError('Driver code already exists', 409);
    }

    if (input.licenseNumber && input.licenseNumber !== existing.licenseNumber) {
      const licenseTaken = await driverRepository.findByLicenseNumber(input.licenseNumber);
      if (licenseTaken) throw new AppError('A driver with this license number already exists', 409);
    }

    const updated = await driverRepository.update(id, {
      name: input.name,
      code: input.code,
      licenseNumber: input.licenseNumber,
      phone: input.phone,
      licenseExpiryDate: input.licenseExpiryDate ? new Date(input.licenseExpiryDate) : undefined,
      isActive: input.isActive,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Driver',
      entityId: id,
      description: `Updated driver ${existing.name}`,
    });

    return serialize(updated);
  },

  async setLicenseDocument(id: string, filePath: string, actorId: string) {
    const existing = await driverRepository.findById(id);
    if (!existing) {
      throw new AppError('Driver not found', 404);
    }

    const updated = await driverRepository.setLicenseDocument(id, filePath, actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Driver',
      entityId: id,
      description: `Updated license document for driver ${existing.name}`,
    });

    return serialize(updated);
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await driverRepository.findById(id);
    if (!existing) {
      throw new AppError('Driver not found', 404);
    }

    const updated = await driverRepository.toggleStatus(id, !existing.isActive, actorId);

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Driver',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} driver ${existing.name}`,
    });

    return serialize(updated);
  },

  async remove(id: string, actorId: string) {
    const existing = await driverRepository.findById(id);
    if (!existing) {
      throw new AppError('Driver not found', 404);
    }

    await driverRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Driver',
      entityId: id,
      description: `Deleted driver ${existing.name}`,
    });
  },
};
