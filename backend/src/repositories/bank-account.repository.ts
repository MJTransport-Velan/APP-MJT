import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const bankAccountRepository = {
  async findManyPaginated(params: { organizationId: string; skip: number; take: number; search?: string; isActive?: boolean }) {
    const where: Prisma.BankAccountWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
      isActive: params.isActive,
      OR: params.search
        ? [
            { accountHolderName: { contains: params.search, mode: 'insensitive' } },
            { accountNumber: { contains: params.search, mode: 'insensitive' } },
            { branchName: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [rows, total] = await prisma.$transaction([
      prisma.bankAccount.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.bankAccount.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.bankAccount.findFirst({ where: { id, deletedAt: null } });
  },

  findByIdBasic(id: string) {
    return prisma.bankAccount.findFirst({ where: { id, deletedAt: null } });
  },

  findByAccountNumber(organizationId: string, accountNumber: string) {
    return prisma.bankAccount.findFirst({ where: { organizationId, accountNumber, deletedAt: null } });
  },

  findPrimary(organizationId: string) {
    return prisma.bankAccount.findFirst({ where: { organizationId, isPrimary: true, deletedAt: null } });
  },

  create(data: Prisma.BankAccountUncheckedCreateInput) {
    return prisma.bankAccount.create({ data });
  },

  update(id: string, data: Prisma.BankAccountUncheckedUpdateInput) {
    return prisma.bankAccount.update({ where: { id }, data });
  },

  clearOtherPrimaries(organizationId: string, exceptId: string) {
    return prisma.bankAccount.updateMany({ where: { organizationId, isPrimary: true, id: { not: exceptId } }, data: { isPrimary: false } });
  },

  countNonTerminalCheques(bankAccountId: string) {
    return prisma.cheque.count({
      where: { bankAccountId, status: { in: ['ISSUED', 'RECEIVED', 'DEPOSITED', 'PRESENTED'] } },
    });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.bankAccount.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  hardDelete(id: string) {
    return prisma.bankAccount.delete({ where: { id } });
  },
};
