import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const transferWithRelations = Prisma.validator<Prisma.AssetTransferInclude>()({
  asset: { select: { id: true, assetCode: true, assetName: true, status: true } },
  fromDepartment: { select: { id: true, name: true } },
  toDepartment: { select: { id: true, name: true } },
});

export type AssetTransferWithRelations = Prisma.AssetTransferGetPayload<{ include: typeof transferWithRelations }>;

export const assetTransferRepository = {
  findManyPaginated(params: { skip: number; take: number; assetId?: string; approvalStatus?: string }) {
    const where: Prisma.AssetTransferWhereInput = {
      AND: [params.assetId ? { assetId: params.assetId } : {}, params.approvalStatus ? { approvalStatus: params.approvalStatus as never } : {}],
    };
    return prisma.$transaction([
      prisma.assetTransfer.findMany({ where, include: transferWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.assetTransfer.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  },

  findById(id: string) {
    return prisma.assetTransfer.findFirst({ where: { id }, include: transferWithRelations });
  },

  create(data: Prisma.AssetTransferUncheckedCreateInput) {
    return prisma.assetTransfer.create({ data, include: transferWithRelations });
  },

  update(id: string, data: Prisma.AssetTransferUncheckedUpdateInput) {
    return prisma.assetTransfer.update({ where: { id }, data, include: transferWithRelations });
  },
};
