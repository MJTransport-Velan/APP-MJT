import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const cashAccountRepository = {
  async findManyPaginated(params: { organizationId: string; skip: number; take: number; search?: string; isActive?: boolean }) {
    const where: Prisma.CashAccountWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
      isActive: params.isActive,
    };

    const [rows, total] = await prisma.$transaction([
      prisma.cashAccount.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.cashAccount.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.cashAccount.findFirst({ where: { id, deletedAt: null } });
  },

  findByIdBasic(id: string) {
    return prisma.cashAccount.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: Prisma.CashAccountUncheckedCreateInput) {
    return prisma.cashAccount.create({ data });
  },

  update(id: string, data: Prisma.CashAccountUncheckedUpdateInput) {
    return prisma.cashAccount.update({ where: { id }, data });
  },

  hardDelete(id: string) {
    return prisma.cashAccount.delete({ where: { id } });
  },

  countOpenRequests(cashAccountId: string) {
    return prisma.pettyCashRequest.count({ where: { cashAccountId, status: { in: ['PENDING', 'APPROVED'] } } });
  },
};
