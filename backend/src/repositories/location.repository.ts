import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const locationRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; isActive?: boolean }) {
    const where: Prisma.LocationWhereInput = {
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
                { city: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.isActive !== undefined ? { isActive: params.isActive } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.location.findMany({ where, orderBy: { name: 'asc' }, skip: params.skip, take: params.take }),
      prisma.location.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.location.findFirst({ where: { id, deletedAt: null } });
  },

  findByCode(code: string) {
    return prisma.location.findFirst({ where: { code, deletedAt: null } });
  },

  create(data: {
    name: string;
    code: string;
    city?: string;
    state?: string;
    pincode?: string;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.location.create({ data });
  },

  update(
    id: string,
    data: Partial<{ name: string; code: string; city: string; state: string; pincode: string; isActive: boolean; updatedById: string }>
  ) {
    return prisma.location.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.location.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  toggleStatus(id: string, isActive: boolean, updatedById: string) {
    return prisma.location.update({ where: { id }, data: { isActive, updatedById } });
  },
};
