import { Request } from 'express';
import { transportRouteRepository, TransportRouteWithLocations } from '../repositories/transport-route.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateRouteInput, UpdateRouteInput } from '../validators/transport-route.validator';

function serialize(route: TransportRouteWithLocations) {
  return {
    id: route.id,
    name: route.name,
    code: route.code,
    distanceKm: route.distanceKm,
    isActive: route.isActive,
    fromLocation: { id: route.fromLocation.id, name: route.fromLocation.name, code: route.fromLocation.code },
    toLocation: { id: route.toLocation.id, name: route.toLocation.name, code: route.toLocation.code },
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
  };
}

export const transportRouteService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const fromLocationId = (query.fromLocationId as string) || undefined;
    const toLocationId = (query.toLocationId as string) || undefined;
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const { rows, total } = await transportRouteRepository.findManyPaginated({
      skip,
      take,
      search,
      fromLocationId,
      toLocationId,
      isActive,
    });

    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const route = await transportRouteRepository.findById(id);
    if (!route) {
      throw new AppError('Route not found', 404);
    }
    return serialize(route);
  },

  async create(input: CreateRouteInput, actorId: string) {
    const codeTaken = await transportRouteRepository.findByCode(input.code);
    if (codeTaken) {
      throw new AppError('Route code already exists', 409);
    }

    const [fromLocation, toLocation] = await Promise.all([
      transportRouteRepository.findLocationById(input.fromLocationId),
      transportRouteRepository.findLocationById(input.toLocationId),
    ]);
    if (!fromLocation) throw new AppError('Origin location not found', 404);
    if (!toLocation) throw new AppError('Destination location not found', 404);

    const route = await transportRouteRepository.create({ ...input, createdById: actorId, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Route',
      entityId: route.id,
      description: `Created route ${route.name}`,
    });

    return transportRouteService.getById(route.id);
  },

  async update(id: string, input: UpdateRouteInput, actorId: string) {
    const existing = await transportRouteRepository.findById(id);
    if (!existing) {
      throw new AppError('Route not found', 404);
    }

    if (input.code && input.code !== existing.code) {
      const codeTaken = await transportRouteRepository.findByCode(input.code);
      if (codeTaken) {
        throw new AppError('Route code already exists', 409);
      }
    }

    if (input.fromLocationId) {
      const fromLocation = await transportRouteRepository.findLocationById(input.fromLocationId);
      if (!fromLocation) throw new AppError('Origin location not found', 404);
    }
    if (input.toLocationId) {
      const toLocation = await transportRouteRepository.findLocationById(input.toLocationId);
      if (!toLocation) throw new AppError('Destination location not found', 404);
    }

    await transportRouteRepository.update(id, { ...input, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Route',
      entityId: id,
      description: `Updated route ${existing.name}`,
    });

    return transportRouteService.getById(id);
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await transportRouteRepository.findById(id);
    if (!existing) {
      throw new AppError('Route not found', 404);
    }

    const updated = await transportRouteRepository.toggleStatus(id, !existing.isActive, actorId);

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Route',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} route ${existing.name}`,
    });

    return transportRouteService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await transportRouteRepository.findById(id);
    if (!existing) {
      throw new AppError('Route not found', 404);
    }

    await transportRouteRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Route',
      entityId: id,
      description: `Deleted route ${existing.name}`,
    });
  },
};
