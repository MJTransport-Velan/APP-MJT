import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const chequeBookRepository = {
  findManyForOrganization(organizationId: string, params: { bankAccountId?: string; isActive?: boolean }) {
    const where: Prisma.ChequeBookWhereInput = {
      organizationId,
      deletedAt: null,
      bankAccountId: params.bankAccountId,
      isActive: params.isActive,
    };
    return prisma.chequeBook.findMany({
      where,
      include: { bankAccount: { select: { id: true, accountHolderName: true, accountNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.chequeBook.findFirst({ where: { id, deletedAt: null } });
  },

  findByBookNumber(bankAccountId: string, bookNumber: string) {
    return prisma.chequeBook.findFirst({ where: { bankAccountId, bookNumber, deletedAt: null } });
  },

  countIssuedLeaves(chequeBookId: string) {
    return prisma.cheque.count({ where: { chequeBookId, direction: 'ISSUED' } });
  },

  create(data: Prisma.ChequeBookUncheckedCreateInput) {
    return prisma.chequeBook.create({ data });
  },

  update(id: string, data: Prisma.ChequeBookUncheckedUpdateInput) {
    return prisma.chequeBook.update({ where: { id }, data });
  },

  countCheques(chequeBookId: string) {
    return prisma.cheque.count({ where: { chequeBookId } });
  },

  hardDelete(id: string) {
    return prisma.chequeBook.delete({ where: { id } });
  },
};
