import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const disposalWithRelations = Prisma.validator<Prisma.AssetDisposalInclude>()({
  asset: { include: { category: true } },
  insuranceClaim: true,
});

export type AssetDisposalWithRelations = Prisma.AssetDisposalGetPayload<{ include: typeof disposalWithRelations }>;

export const assetDisposalRepository = {
  findManyPaginated(params: { skip: number; take: number; approvalStatus?: string; disposalType?: string }) {
    const where: Prisma.AssetDisposalWhereInput = {
      AND: [params.approvalStatus ? { approvalStatus: params.approvalStatus as never } : {}, params.disposalType ? { disposalType: params.disposalType as never } : {}],
    };
    return prisma.$transaction([
      prisma.assetDisposal.findMany({ where, include: disposalWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.assetDisposal.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  },

  findById(id: string) {
    return prisma.assetDisposal.findFirst({ where: { id }, include: disposalWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.assetDisposal.findFirst({ where: { id } });
  },

  findAssetById(id: string) {
    return prisma.fixedAsset.findFirst({ where: { id, deletedAt: null }, include: { category: true } });
  },

  create(data: Prisma.AssetDisposalUncheckedCreateInput) {
    return prisma.assetDisposal.create({ data, include: disposalWithRelations });
  },

  update(id: string, data: Prisma.AssetDisposalUncheckedUpdateInput) {
    return prisma.assetDisposal.update({ where: { id }, data, include: disposalWithRelations });
  },
};
