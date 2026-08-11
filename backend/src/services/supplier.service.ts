import { Request } from 'express';
import { supplierRepository } from '../repositories/supplier.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateSupplierInput, UpdateSupplierInput } from '../validators/supplier.validator';

interface SupplierRecord {
  id: string;
  name: string;
  code: string;
  gstNumber: string | null;
  panNumber: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  document: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(supplier: SupplierRecord) {
  return {
    id: supplier.id,
    name: supplier.name,
    code: supplier.code,
    gstNumber: supplier.gstNumber,
    panNumber: supplier.panNumber,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    document: supplier.document,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

export const supplierService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const { rows, total } = await supplierRepository.findManyPaginated({ skip, take, search, isActive });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }
    return serialize(supplier);
  },

  async create(input: CreateSupplierInput, actorId: string) {
    const codeTaken = await supplierRepository.findByCode(input.code);
    if (codeTaken) {
      throw new AppError('Supplier code already exists', 409);
    }

    const supplier = await supplierRepository.create({ ...input, createdById: actorId, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Supplier',
      entityId: supplier.id,
      description: `Created supplier ${supplier.name}`,
    });

    return serialize(supplier);
  },

  async update(id: string, input: UpdateSupplierInput, actorId: string) {
    const existing = await supplierRepository.findById(id);
    if (!existing) {
      throw new AppError('Supplier not found', 404);
    }

    if (input.code && input.code !== existing.code) {
      const codeTaken = await supplierRepository.findByCode(input.code);
      if (codeTaken) throw new AppError('Supplier code already exists', 409);
    }

    const updated = await supplierRepository.update(id, { ...input, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Supplier',
      entityId: id,
      description: `Updated supplier ${existing.name}`,
    });

    return serialize(updated);
  },

  async setDocument(id: string, filePath: string, actorId: string) {
    const existing = await supplierRepository.findById(id);
    if (!existing) {
      throw new AppError('Supplier not found', 404);
    }

    const updated = await supplierRepository.setDocument(id, filePath, actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Supplier',
      entityId: id,
      description: `Updated document for supplier ${existing.name}`,
    });

    return serialize(updated);
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await supplierRepository.findById(id);
    if (!existing) {
      throw new AppError('Supplier not found', 404);
    }

    const updated = await supplierRepository.toggleStatus(id, !existing.isActive, actorId);

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Supplier',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} supplier ${existing.name}`,
    });

    return serialize(updated);
  },

  async remove(id: string, actorId: string) {
    const existing = await supplierRepository.findById(id);
    if (!existing) {
      throw new AppError('Supplier not found', 404);
    }

    const vehicleUsage = await supplierRepository.countVehicles(id);
    if (vehicleUsage > 0) {
      throw new AppError(
        `Cannot delete supplier "${existing.name}" — it is linked to ${vehicleUsage} market fleet vehicle(s).`,
        409
      );
    }

    await supplierRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Supplier',
      entityId: id,
      description: `Deleted supplier ${existing.name}`,
    });
  },
};
