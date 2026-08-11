import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const systemExceptionRepository = {
  create(data: Prisma.SystemExceptionUncheckedCreateInput) {
    return prisma.systemException.create({ data });
  },

  async findManyPaginated(params: { status?: string; errorType?: string; module?: string; skip: number; take: number }) {
    const where: Prisma.SystemExceptionWhereInput = {
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.errorType ? { errorType: params.errorType as never } : {}),
      ...(params.module ? { module: params.module } : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.systemException.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.systemException.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.systemException.findUnique({ where: { id } });
  },

  acknowledge(id: string, actorId: string) {
    return prisma.systemException.update({ where: { id }, data: { status: 'ACKNOWLEDGED', acknowledgedById: actorId, acknowledgedAt: new Date() } });
  },

  resolve(id: string, actorId: string, resolution: string) {
    return prisma.systemException.update({ where: { id }, data: { status: 'RESOLVED', resolvedById: actorId, resolvedAt: new Date(), resolution } });
  },

  openCount() {
    return prisma.systemException.count({ where: { status: 'OPEN' } });
  },
};
