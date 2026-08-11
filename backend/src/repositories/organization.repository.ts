import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const organizationRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; isActive?: boolean }) {
    const where: Prisma.OrganizationWhereInput = {
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
        params.isActive !== undefined ? { isActive: params.isActive } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.organization.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.organization.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.organization.findFirst({ where: { id, deletedAt: null } });
  },

  findByCode(code: string) {
    return prisma.organization.findFirst({ where: { code, deletedAt: null } });
  },

  findFirstActive() {
    return prisma.organization.findFirst({ where: { deletedAt: null, isActive: true }, orderBy: { createdAt: 'asc' } });
  },

  create(data: {
    code: string;
    name: string;
    gstNumber?: string;
    panNumber?: string;
    tanNumber?: string;
    address?: string;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.organization.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      gstNumber: string;
      panNumber: string;
      tanNumber: string;
      address: string;
      isActive: boolean;
      updatedById: string;
    }>
  ) {
    return prisma.organization.update({ where: { id }, data });
  },

  toggleStatus(id: string, isActive: boolean, updatedById: string) {
    return prisma.organization.update({ where: { id }, data: { isActive, updatedById } });
  },
};
