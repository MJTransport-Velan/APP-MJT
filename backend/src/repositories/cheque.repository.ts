import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const detailInclude = {
  bankAccount: { select: { id: true, accountHolderName: true, accountNumber: true } },
  chequeBook: { select: { id: true, bookNumber: true } },
  depositedIntoBankAccount: { select: { id: true, accountHolderName: true, accountNumber: true } },
};

export const chequeRepository = {
  async findManyPaginated(params: {
    organizationId: string;
    skip: number;
    take: number;
    search?: string;
    bankAccountId?: string;
    direction?: string;
    status?: string;
  }) {
    const where: Prisma.ChequeWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
      bankAccountId: params.bankAccountId,
      direction: params.direction as never,
      status: params.status as never,
      OR: params.search
        ? [
            { chequeNumber: { contains: params.search, mode: 'insensitive' } },
            { payeeOrPayerName: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [rows, total] = await prisma.$transaction([
      prisma.cheque.findMany({ where, include: detailInclude, orderBy: { chequeDate: 'desc' }, skip: params.skip, take: params.take }),
      prisma.cheque.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.cheque.findFirst({ where: { id, deletedAt: null }, include: detailInclude });
  },

  findByIdBasic(id: string) {
    return prisma.cheque.findFirst({ where: { id, deletedAt: null } });
  },

  findByNumber(bankAccountId: string, chequeNumber: string, direction: string) {
    return prisma.cheque.findFirst({ where: { bankAccountId, chequeNumber, direction: direction as never, deletedAt: null } });
  },

  create(data: Prisma.ChequeUncheckedCreateInput) {
    return prisma.cheque.create({ data, include: detailInclude });
  },

  update(id: string, data: Prisma.ChequeUncheckedUpdateInput) {
    return prisma.cheque.update({ where: { id }, data, include: detailInclude });
  },
};
