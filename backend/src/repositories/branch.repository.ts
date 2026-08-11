import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const branchRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    companyId?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.BranchWhereInput = {
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
        params.companyId ? { companyId: params.companyId } : {},
        params.isActive !== undefined ? { isActive: params.isActive } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.branch.findMany({
        where,
        include: { company: true },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.branch.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.branch.findFirst({ where: { id, deletedAt: null }, include: { company: true } });
  },

  findByCode(code: string) {
    return prisma.branch.findFirst({ where: { code, deletedAt: null } });
  },

  findCompanyById(id: string) {
    return prisma.company.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: {
    companyId: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.branch.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      address: string;
      phone: string;
      email: string;
      isActive: boolean;
      updatedById: string;
    }>
  ) {
    return prisma.branch.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.branch.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  toggleStatus(id: string, isActive: boolean, updatedById: string) {
    return prisma.branch.update({ where: { id }, data: { isActive, updatedById } });
  },
};
