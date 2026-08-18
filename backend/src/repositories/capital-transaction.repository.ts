import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { dateRangeWhere } from '../utils/reportFilters';

const capitalTransactionWithRelations = Prisma.validator<Prisma.CapitalTransactionInclude>()({
  partner: true,
});

export type CapitalTransactionWithRelations = Prisma.CapitalTransactionGetPayload<{ include: typeof capitalTransactionWithRelations }>;

export const capitalTransactionRepository = {
  async findManyPaginated(params: { skip: number; take: number; partnerId?: string; type?: string; dateFrom?: Date; dateTo?: Date }) {
    const where: Prisma.CapitalTransactionWhereInput = {
      deletedAt: null,
      AND: [
        params.partnerId ? { partnerId: params.partnerId } : {},
        params.type ? { type: params.type as never } : {},
        dateRangeWhere('transactionDate', { dateFrom: params.dateFrom, dateTo: params.dateTo }),
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.capitalTransaction.findMany({ where, include: capitalTransactionWithRelations, orderBy: { transactionDate: 'desc' }, skip: params.skip, take: params.take }),
      prisma.capitalTransaction.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.capitalTransaction.findFirst({ where: { id, deletedAt: null }, include: capitalTransactionWithRelations });
  },

  findPartnerById(id: string) {
    return prisma.capitalPartner.findFirst({ where: { id, deletedAt: null } });
  },

  async nextTransactionNumber() {
    const count = await prisma.capitalTransaction.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `CAP-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  create(data: Prisma.CapitalTransactionUncheckedCreateInput) {
    return prisma.capitalTransaction.create({ data, include: capitalTransactionWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.capitalTransaction.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  /** Every CONTRIBUTION/WITHDRAWAL for one partner, unpaginated — this is a single-partner statement view, same shape as driver-statement.service.ts's history query. */
  findAllByPartner(partnerId: string) {
    return prisma.capitalTransaction.findMany({ where: { partnerId, deletedAt: null }, orderBy: { transactionDate: 'desc' } });
  },
};
