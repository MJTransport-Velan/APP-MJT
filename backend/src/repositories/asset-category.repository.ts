import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const assetCategoryRepository = {
  findMany(isActive?: boolean) {
    return prisma.assetCategory.findMany({
      where: { deletedAt: null, ...(isActive !== undefined ? { isActive } : {}) },
      orderBy: { name: 'asc' },
    });
  },

  findById(id: string) {
    return prisma.assetCategory.findFirst({ where: { id, deletedAt: null } });
  },

  findByCode(code: string) {
    return prisma.assetCategory.findFirst({ where: { code, deletedAt: null } });
  },

  create(data: Prisma.AssetCategoryUncheckedCreateInput) {
    return prisma.assetCategory.create({ data });
  },

  update(id: string, data: Prisma.AssetCategoryUncheckedUpdateInput) {
    return prisma.assetCategory.update({ where: { id }, data });
  },

  /** How many live assets still point at this category — a delete guard. */
  countAssets(categoryId: string) {
    return prisma.fixedAsset.count({ where: { categoryId, deletedAt: null } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.assetCategory.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
