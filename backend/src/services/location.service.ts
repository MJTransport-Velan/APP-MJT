import { Request } from 'express';
import { locationRepository } from '../repositories/location.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateLocationInput, UpdateLocationInput } from '../validators/location.validator';

interface LocationRecord {
  id: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(location: LocationRecord) {
  return {
    id: location.id,
    name: location.name,
    code: location.code,
    city: location.city,
    state: location.state,
    pincode: location.pincode,
    isActive: location.isActive,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  };
}

export const locationService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const { rows, total } = await locationRepository.findManyPaginated({ skip, take, search, isActive });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const location = await locationRepository.findById(id);
    if (!location) {
      throw new AppError('Location not found', 404);
    }
    return serialize(location);
  },

  async create(input: CreateLocationInput, actorId: string) {
    const codeTaken = await locationRepository.findByCode(input.code);
    if (codeTaken) {
      throw new AppError('Location code already exists', 409);
    }

    const location = await locationRepository.create({ ...input, createdById: actorId, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Location',
      entityId: location.id,
      description: `Created location ${location.name}`,
    });

    return serialize(location);
  },

  async update(id: string, input: UpdateLocationInput, actorId: string) {
    const existing = await locationRepository.findById(id);
    if (!existing) {
      throw new AppError('Location not found', 404);
    }

    if (input.code && input.code !== existing.code) {
      const codeTaken = await locationRepository.findByCode(input.code);
      if (codeTaken) {
        throw new AppError('Location code already exists', 409);
      }
    }

    const updated = await locationRepository.update(id, { ...input, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Location',
      entityId: id,
      description: `Updated location ${existing.name}`,
    });

    return serialize(updated);
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await locationRepository.findById(id);
    if (!existing) {
      throw new AppError('Location not found', 404);
    }

    const updated = await locationRepository.toggleStatus(id, !existing.isActive, actorId);

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Location',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} location ${existing.name}`,
    });

    return serialize(updated);
  },

  async remove(id: string, actorId: string) {
    const existing = await locationRepository.findById(id);
    if (!existing) {
      throw new AppError('Location not found', 404);
    }

    const routeUsage = await locationRepository.countRouteUsage(id);
    if (routeUsage > 0) {
      throw new AppError(
        `Cannot delete location "${existing.name}" — it is used by ${routeUsage} transport route(s).`,
        409
      );
    }

    await locationRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Location',
      entityId: id,
      description: `Deleted location ${existing.name}`,
    });
  },
};
