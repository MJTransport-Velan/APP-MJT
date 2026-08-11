import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const entryWithRelations = Prisma.validator<Prisma.FinancialEntryInclude>()({
  paymentMode: { select: { id: true, name: true, code: true } },
  correctionOf: { select: { id: true, entryNumber: true } },
  correctedBy: { select: { id: true, entryNumber: true } },
  reversalOf: { select: { id: true, entryNumber: true } },
  reversedBy: { select: { id: true, entryNumber: true } },
});

export type FinancialEntryWithRelations = Prisma.FinancialEntryGetPayload<{ include: typeof entryWithRelations }>;

export const financialEntryRepository = {
  async findManyPaginated(params: {
    organizationId: string;
    skip: number;
    take: number;
    search?: string;
    entryType?: string;
    status?: string;
    sourceType?: string;
    sourceId?: string;
    destinationType?: string;
    destinationId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.FinancialEntryWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { entryNumber: { contains: params.search, mode: 'insensitive' } },
                { referenceNumber: { contains: params.search, mode: 'insensitive' } },
                { sourceLabel: { contains: params.search, mode: 'insensitive' } },
                { destinationLabel: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.entryType ? { entryType: params.entryType as never } : {},
        params.status ? { status: params.status as never } : {},
        params.sourceType ? { sourceType: params.sourceType as never } : {},
        params.sourceId ? { sourceId: params.sourceId } : {},
        params.destinationType ? { destinationType: params.destinationType as never } : {},
        params.destinationId ? { destinationId: params.destinationId } : {},
        params.dateFrom ? { entryDate: { gte: params.dateFrom } } : {},
        params.dateTo ? { entryDate: { lte: params.dateTo } } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.financialEntry.findMany({ where, include: entryWithRelations, orderBy: { entryDate: 'desc' }, skip: params.skip, take: params.take }),
      prisma.financialEntry.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.financialEntry.findFirst({ where: { id, deletedAt: null }, include: entryWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.financialEntry.findFirst({ where: { id, deletedAt: null } });
  },

  async nextEntryNumber() {
    const count = await prisma.financialEntry.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `FE-${datePart}-${String(count + 1).padStart(5, '0')}`;
  },

  create(data: Prisma.FinancialEntryUncheckedCreateInput) {
    return prisma.financialEntry.create({ data, include: entryWithRelations });
  },

  update(id: string, data: Prisma.FinancialEntryUncheckedUpdateInput) {
    return prisma.financialEntry.update({ where: { id }, data, include: entryWithRelations });
  },
};
