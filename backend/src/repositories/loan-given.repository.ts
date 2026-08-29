import { Prisma, LoanGivenStatus, LoanOrigin } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const loanGivenWithRelations = Prisma.validator<Prisma.LoanGivenInclude>()({
  repayments: { orderBy: { repaymentDate: 'asc' } },
});

export type LoanGivenWithRelations = Prisma.LoanGivenGetPayload<{ include: typeof loanGivenWithRelations }>;

export const loanGivenRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    status?: LoanGivenStatus;
    origin?: LoanOrigin;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.LoanGivenWhereInput = {
      deletedAt: null,
      AND: [
        params.origin ? { origin: params.origin } : {},
        params.search
          ? {
              OR: [
                { partyName: { contains: params.search, mode: 'insensitive' } },
                { referenceNumber: { contains: params.search, mode: 'insensitive' } },
                { partyContact: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.status ? { status: params.status } : {},
        params.from || params.to
          ? { givenDate: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
          : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.loanGiven.findMany({ where, include: loanGivenWithRelations, orderBy: { givenDate: 'desc' }, skip: params.skip, take: params.take }),
      prisma.loanGiven.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.loanGiven.findFirst({ where: { id, deletedAt: null }, include: loanGivenWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.loanGiven.findFirst({ where: { id, deletedAt: null } });
  },

  async nextReferenceNumber() {
    return nextDocumentNumber('LG', 4, async (stamp) => {
      const rows = await prisma.loanGiven.findMany({
        where: { referenceNumber: { startsWith: `LG-${stamp}-` } },
        select: { referenceNumber: true },
      });
      return highestSequenceToday(rows, 'referenceNumber', 'LG', stamp);
    });
  },

  create(data: Prisma.LoanGivenUncheckedCreateInput) {
    return prisma.loanGiven.create({ data, include: loanGivenWithRelations });
  },

  update(id: string, data: Prisma.LoanGivenUncheckedUpdateInput) {
    return prisma.loanGiven.update({ where: { id }, data, include: loanGivenWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.loanGiven.update({ where: { id }, data: { deletedAt: new Date(), updatedById } });
  },

  createRepayment(data: Prisma.LoanGivenRepaymentUncheckedCreateInput) {
    return prisma.loanGivenRepayment.create({ data });
  },

  findRepayment(loanGivenId: string, repaymentId: string) {
    return prisma.loanGivenRepayment.findFirst({ where: { id: repaymentId, loanGivenId } });
  },

  deleteRepayment(id: string) {
    return prisma.loanGivenRepayment.delete({ where: { id } });
  },

  repaidTotal(loanGivenId: string) {
    return prisma.loanGivenRepayment.aggregate({ where: { loanGivenId }, _sum: { amount: true } });
  },

  /**
   * Every live loan given as at a date, with the repayments received by that
   * same date — the Balance Sheet works out what is still owed from these
   * rather than trusting a stored figure.
   */
  findOutstandingAsOf(cutoff: Date) {
    return prisma.loanGiven.findMany({
      where: { deletedAt: null, status: { not: 'WRITTEN_OFF' }, givenDate: { lte: cutoff } },
      select: {
        id: true,
        referenceNumber: true,
        partyName: true,
        amount: true,
        givenDate: true,
        expectedReturnDate: true,
        repayments: { where: { repaymentDate: { lte: cutoff } }, select: { amount: true } },
      },
    });
  },

  /** Headline figures for the module's own screen. */
  async summary() {
    const [outstandingRows, writtenOff] = await Promise.all([
      prisma.loanGiven.findMany({
        where: { deletedAt: null, status: { not: 'WRITTEN_OFF' } },
        select: { amount: true, expectedReturnDate: true, repayments: { select: { amount: true } } },
      }),
      prisma.loanGiven.aggregate({ where: { deletedAt: null, status: 'WRITTEN_OFF' }, _sum: { amount: true } }),
    ]);
    return { outstandingRows, writtenOffTotal: Number(writtenOff._sum.amount ?? 0) };
  },
};
