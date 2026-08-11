import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const collectionActivityRepository = {
  findManyPaginated(params: { skip: number; take: number; companyId?: string; invoiceId?: string }) {
    const where: Prisma.CollectionActivityWhereInput = {
      companyId: params.companyId,
      invoiceId: params.invoiceId,
    };
    return Promise.all([
      prisma.collectionActivity.findMany({
        where,
        include: { company: { select: { id: true, name: true } }, invoice: { select: { id: true, invoiceNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.collectionActivity.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  },

  upcomingFollowUps(days: number) {
    const to = new Date();
    to.setDate(to.getDate() + days);
    return prisma.collectionActivity.findMany({
      where: { followUpDate: { lte: to } },
      include: { company: { select: { id: true, name: true } }, invoice: { select: { id: true, invoiceNumber: true } } },
      orderBy: { followUpDate: 'asc' },
      take: 50,
    });
  },

  create(data: Prisma.CollectionActivityUncheckedCreateInput) {
    return prisma.collectionActivity.create({ data });
  },
};
