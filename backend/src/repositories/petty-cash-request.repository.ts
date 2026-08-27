import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const detailInclude = {
  cashAccount: true,
  disbursementTransfer: { select: { id: true, transferNumber: true } },
};

export const pettyCashRequestRepository = {
  async findManyPaginated(params: { organizationId: string; skip: number; take: number; status?: string; cashAccountId?: string }) {
    const where: Prisma.PettyCashRequestWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
      status: params.status as never,
      cashAccountId: params.cashAccountId,
    };
    const [rows, total] = await prisma.$transaction([
      prisma.pettyCashRequest.findMany({ where, include: detailInclude, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.pettyCashRequest.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.pettyCashRequest.findFirst({ where: { id, deletedAt: null }, include: detailInclude });
  },

  findByIdBasic(id: string) {
    return prisma.pettyCashRequest.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: Prisma.PettyCashRequestUncheckedCreateInput) {
    return prisma.pettyCashRequest.create({ data, include: detailInclude });
  },

  hardDelete(id: string) {
    return prisma.pettyCashRequest.delete({ where: { id } });
  },

  update(id: string, data: Prisma.PettyCashRequestUncheckedUpdateInput) {
    return prisma.pettyCashRequest.update({ where: { id }, data, include: detailInclude });
  },
};
