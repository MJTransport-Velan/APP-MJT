import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

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

  async nextTransferNumber(organizationId: string) {
    const count = await prisma.bankTransfer.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TRF-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  create(data: Prisma.BankTransferUncheckedCreateInput) {
    return prisma.bankTransfer.create({ data, include: detailInclude });
  },
};
