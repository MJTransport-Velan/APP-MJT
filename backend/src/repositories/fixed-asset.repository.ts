import { Prisma, FixedAssetStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const assetWithRelations = Prisma.validator<Prisma.FixedAssetInclude>()({
  category: true,
  vehicle: { select: { id: true, registrationNumber: true } },
  supplier: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
});

export type FixedAssetWithRelations = Prisma.FixedAssetGetPayload<{ include: typeof assetWithRelations }>;

export const fixedAssetRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    categoryId?: string;
    status?: FixedAssetStatus;
    approvalStatus?: string;
    assetOrigin?: string;
    assetType?: string;
  }) {
    const where: Prisma.FixedAssetWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { OR: [{ assetCode: { contains: params.search, mode: 'insensitive' } }, { assetName: { contains: params.search, mode: 'insensitive' } }] } : {},
        params.categoryId ? { categoryId: params.categoryId } : {},
        params.status ? { status: params.status } : {},
        params.approvalStatus ? { approvalStatus: params.approvalStatus as never } : {},
        params.assetOrigin ? { assetOrigin: params.assetOrigin as never } : {},
        // "Vehicles" vs "Other Assets" is the split users actually filter by.
        params.assetType === 'VEHICLE' ? { vehicleId: { not: null } } : params.assetType === 'OTHER' ? { vehicleId: null } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.fixedAsset.findMany({ where, include: assetWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.fixedAsset.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.fixedAsset.findFirst({ where: { id, deletedAt: null }, include: assetWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.fixedAsset.findFirst({ where: { id, deletedAt: null } });
  },

  findCategoryById(id: string) {
    return prisma.assetCategory.findFirst({ where: { id, deletedAt: null } });
  },

  /**
   * Issued from the shared DocumentCounter sequence rather than count()+1,
   * which both races and reuses codes after a delete (the count drops while
   * surviving assets keep their codes) — see documentNumber.util.ts.
   * The counter is per category code, matching the existing code format.
   */
  async nextAssetCode(categoryCode: string) {
    const prefix = `AST-${categoryCode}`;
    return nextDocumentNumber(prefix, 4, async (stamp) => {
      const rows = await prisma.fixedAsset.findMany({
        where: { assetCode: { startsWith: `${prefix}-${stamp}-` } },
        select: { assetCode: true },
      });
      return highestSequenceToday(rows, 'assetCode', prefix, stamp);
    });
  },

  create(data: Prisma.FixedAssetUncheckedCreateInput) {
    return prisma.fixedAsset.create({ data, include: assetWithRelations });
  },

  update(id: string, data: Prisma.FixedAssetUncheckedUpdateInput) {
    return prisma.fixedAsset.update({ where: { id }, data, include: assetWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.fixedAsset.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
