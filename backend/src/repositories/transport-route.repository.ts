import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const routeWithLocations = Prisma.validator<Prisma.TransportRouteInclude>()({
  fromLocation: true,
  toLocation: true,
});

export type TransportRouteWithLocations = Prisma.TransportRouteGetPayload<{ include: typeof routeWithLocations }>;

export const transportRouteRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    fromLocationId?: string;
    toLocationId?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.TransportRouteWhereInput = {
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.fromLocationId ? { fromLocationId: params.fromLocationId } : {},
        params.toLocationId ? { toLocationId: params.toLocationId } : {},
        params.isActive !== undefined ? { isActive: params.isActive } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.transportRoute.findMany({
        where,
        include: routeWithLocations,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.transportRoute.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.transportRoute.findFirst({ where: { id, deletedAt: null }, include: routeWithLocations });
  },

  findByCode(code: string) {
    return prisma.transportRoute.findFirst({ where: { code, deletedAt: null } });
  },

  findLocationById(id: string) {
    return prisma.location.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: {
    name: string;
    code: string;
    fromLocationId: string;
    toLocationId: string;
    distanceKm?: number;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.transportRoute.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      fromLocationId: string;
      toLocationId: string;
      distanceKm: number;
      isActive: boolean;
      updatedById: string;
    }>
  ) {
    return prisma.transportRoute.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.transportRoute.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedById },
    });
  },

  toggleStatus(id: string, isActive: boolean, updatedById: string) {
    return prisma.transportRoute.update({ where: { id }, data: { isActive, updatedById } });
  },
};
