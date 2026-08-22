import { Prisma, DepreciationRunStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const runWithRelations = Prisma.validator<Prisma.DepreciationRunInclude>()({
  lines: { include: { asset: { include: { category: true } } } },
});

export type DepreciationRunWithRelations = Prisma.DepreciationRunGetPayload<{ include: typeof runWithRelations }>;

export const depreciationRunRepository = {
  async findManyPaginated(params: { skip: number; take: number; status?: DepreciationRunStatus }) {
    const where: Prisma.DepreciationRunWhereInput = { deletedAt: null, AND: [params.status ? { status: params.status } : {}] };
    const [rows, total] = await prisma.$transaction([
      prisma.depreciationRun.findMany({ where, include: runWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.depreciationRun.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.depreciationRun.findFirst({ where: { id, deletedAt: null }, include: runWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.depreciationRun.findFirst({ where: { id, deletedAt: null } });
  },

  findOverlapping(periodType: string, periodStart: Date, periodEnd: Date) {
    return prisma.depreciationRun.findFirst({
      where: { periodType: periodType as never, deletedAt: null, periodStart: { lte: periodEnd }, periodEnd: { gte: periodStart } },
    });
  },

  async nextRunNumber() {
    return nextDocumentNumber('DEP', 4, async (stamp) => {
      const rows = await prisma.depreciationRun.findMany({
        where: { runNumber: { startsWith: `DEP-${stamp}-` } },
        select: { runNumber: true },
      });
      return highestSequenceToday(rows, 'runNumber', 'DEP', stamp);
    });
  },

  create(data: Prisma.DepreciationRunUncheckedCreateInput) {
    return prisma.depreciationRun.create({ data });
  },

  update(id: string, data: Prisma.DepreciationRunUncheckedUpdateInput) {
    return prisma.depreciationRun.update({ where: { id }, data });
  },

  deleteLines(runId: string) {
    return prisma.depreciationRunLine.deleteMany({ where: { runId } });
  },

  createLines(data: Prisma.DepreciationRunLineUncheckedCreateInput[]) {
    if (data.length === 0) return Promise.resolve();
    return prisma.depreciationRunLine.createMany({ data });
  },

  /** ACTIVE assets, capitalized on or before the period end, not yet fully depreciated to residual value. */
  findEligibleAssets(periodEnd: Date) {
    return prisma.fixedAsset.findMany({
      where: { status: 'ACTIVE', deletedAt: null, capitalizationDate: { lte: periodEnd } },
      include: { category: true },
    });
  },

  sumPriorDepreciation(assetId: string) {
    return prisma.depreciationRunLine.aggregate({ where: { assetId }, _sum: { depreciationAmount: true } });
  },
};
