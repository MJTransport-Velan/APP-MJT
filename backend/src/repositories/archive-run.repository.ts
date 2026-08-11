import { ArchiveScope, Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const archiveRunRepository = {
  create(data: Prisma.ArchiveRunUncheckedCreateInput) {
    return prisma.archiveRun.create({ data });
  },

  update(id: string, data: Prisma.ArchiveRunUncheckedUpdateInput) {
    return prisma.archiveRun.update({ where: { id }, data });
  },

  async findManyPaginated(params: { scope?: ArchiveScope; skip: number; take: number }) {
    const where: Prisma.ArchiveRunWhereInput = { ...(params.scope ? { scope: params.scope } : {}) };
    const [rows, total] = await prisma.$transaction([
      prisma.archiveRun.findMany({ where, orderBy: { startedAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.archiveRun.count({ where }),
    ]);
    return { rows, total };
  },
};
