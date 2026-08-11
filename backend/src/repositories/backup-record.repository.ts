import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const backupRecordRepository = {
  create(data: Prisma.BackupRecordUncheckedCreateInput) {
    return prisma.backupRecord.create({ data });
  },

  update(id: string, data: Prisma.BackupRecordUncheckedUpdateInput) {
    return prisma.backupRecord.update({ where: { id }, data });
  },

  findById(id: string) {
    return prisma.backupRecord.findUnique({ where: { id } });
  },

  async findManyPaginated(params: { skip: number; take: number }) {
    const [rows, total] = await prisma.$transaction([
      prisma.backupRecord.findMany({ orderBy: { startedAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.backupRecord.count(),
    ]);
    return { rows, total };
  },

  latestSuccessful() {
    return prisma.backupRecord.findFirst({ where: { status: 'SUCCESS' }, orderBy: { startedAt: 'desc' } });
  },
};
