import { assetCategoryRepository } from '../repositories/asset-category.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { CreateAssetCategoryInput, UpdateAssetCategoryInput } from '../validators/asset-category.validator';

function serialize(c: Awaited<ReturnType<typeof assetCategoryRepository.findById>>) {
  if (!c) return c;
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    assetType: c.assetType,
    usefulLifeMonths: c.usefulLifeMonths,
    depreciationMethod: c.depreciationMethod,
    depreciationRatePercent: c.depreciationRatePercent,
    residualValuePercent: c.residualValuePercent,
    isSystemCategory: c.isSystemCategory,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export const assetCategoryService = {
  async list(isActive?: boolean) {
    const rows = await assetCategoryRepository.findMany(isActive);
    return rows.map(serialize);
  },

  async getById(id: string) {
    const c = await assetCategoryRepository.findById(id);
    if (!c) throw new AppError('Asset Category not found', 404);
    return serialize(c);
  },

  async create(input: CreateAssetCategoryInput, actorId: string) {
    const existing = await assetCategoryRepository.findByCode(input.code);
    if (existing) throw new AppError(`Asset Category code "${input.code}" already exists`, 409);

    const category = await assetCategoryRepository.create({
      code: input.code,
      name: input.name,
      assetType: input.assetType,
      usefulLifeMonths: input.usefulLifeMonths,
      depreciationMethod: input.depreciationMethod ?? 'STRAIGHT_LINE',
      depreciationRatePercent: input.depreciationRatePercent,
      residualValuePercent: input.residualValuePercent ?? 5,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'AssetCategory', entityId: category.id, description: `Created asset category ${category.name}` });
    return assetCategoryService.getById(category.id);
  },

  async update(id: string, input: UpdateAssetCategoryInput, actorId: string) {
    const existing = await assetCategoryRepository.findById(id);
    if (!existing) throw new AppError('Asset Category not found', 404);

    await assetCategoryRepository.update(id, {
      name: input.name,
      usefulLifeMonths: input.usefulLifeMonths,
      depreciationMethod: input.depreciationMethod,
      depreciationRatePercent: input.depreciationRatePercent,
      residualValuePercent: input.residualValuePercent,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'AssetCategory', entityId: id, description: `Updated asset category ${existing.name}` });
    return assetCategoryService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await assetCategoryRepository.findById(id);
    if (!existing) throw new AppError('Asset Category not found', 404);
    if (existing.isSystemCategory) throw new AppError(`Asset Category "${existing.name}" is system-defined and cannot be deleted`, 409);

    // Deleting a category out from under its assets leaves them pointing at
    // something that no longer appears anywhere in the UI, and their
    // depreciation terms unexplainable. Same guard style as the rest of the
    // app ("cannot delete a loan with paid EMI").
    const assetCount = await assetCategoryRepository.countAssets(id);
    if (assetCount > 0) {
      throw new AppError(
        `Asset Category "${existing.name}" is used by ${assetCount} asset${assetCount === 1 ? '' : 's'} — reassign or delete ${assetCount === 1 ? 'it' : 'them'} first.`,
        409
      );
    }

    await assetCategoryRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'AssetCategory', entityId: id, description: `Deleted asset category ${existing.name}` });
  },
};
