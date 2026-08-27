import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const detailInclude = {
  paymentMode: { select: { id: true, code: true, name: true } },
};

export const bankTransferRepository = {
  async findManyPaginated(params: { organizationId: string; skip: number; take: number; search?: string }) {
    const where: Prisma.BankTransferWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
      OR: params.search
        ? [
            { transferNumber: { contains: params.search, mode: 'insensitive' } },
            { referenceNumber: { contains: params.search, mode: 'insensitive' } },
            { narration: { contains: params.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [rows, total] = await prisma.$transaction([
      prisma.bankTransfer.findMany({ where, include: detailInclude, orderBy: { transferDate: 'desc' }, skip: params.skip, take: params.take }),
      prisma.bankTransfer.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.bankTransfer.findFirst({ where: { id, deletedAt: null }, include: detailInclude });
  },

  /**
   * Issued from the shared DocumentCounter sequence rather than count()+1,
   * which races (two simultaneous transfers mint the same number and one
   * user gets an unexplained "already exists") — see documentNumber.util.ts.
   */
  async nextTransferNumber(_organizationId: string) {
    return nextDocumentNumber('TRF', 4, async (stamp) => {
      const rows = await prisma.bankTransfer.findMany({
        where: { transferNumber: { startsWith: `TRF-${stamp}-` } },
        select: { transferNumber: true },
      });
      return highestSequenceToday(rows, 'transferNumber', 'TRF', stamp);
    });
  },

  create(data: Prisma.BankTransferUncheckedCreateInput) {
    return prisma.bankTransfer.create({ data, include: detailInclude });
  },

  update(id: string, data: Prisma.BankTransferUncheckedUpdateInput) {
    return prisma.bankTransfer.update({ where: { id }, data, include: detailInclude });
  },

  hardDelete(id: string) {
    return prisma.bankTransfer.delete({ where: { id } });
  },
};
