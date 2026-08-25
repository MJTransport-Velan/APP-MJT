import { Prisma, FixedAssetStatus } from '@prisma/client';
import { prisma } from '../config/db';

const assetWithRelations = Prisma.validator<Prisma.FixedAssetInclude>()({
  category: true,
  vehicle: { select: { id: true, registrationNumber: true } },
  supplier: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
});

export type FixedAssetWithRelations = Prisma.FixedAssetGetPayload<{ include: typeof assetWithRelations }>;

export const fixedAssetRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; categoryId?: string; status?: FixedAssetStatus; approvalStatus?: string }) {
    const where: Prisma.FixedAssetWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { OR: [{ assetCode: { contains: params.search, mode: 'insensitive' } }, { assetName: { contains: params.search, mode: 'insensitive' } }] } : {},
        params.categoryId ? { categoryId: params.categoryId } : {},
        params.status ? { status: params.status } : {},
        params.approvalStatus ? { approvalStatus: params.approvalStatus as never } : {},
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

  async nextAssetCode(categoryCode: string) {
    const count = await prisma.fixedAsset.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `AST-${categoryCode}-${datePart}-${String(count + 1).padStart(4, '0')}`;
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
