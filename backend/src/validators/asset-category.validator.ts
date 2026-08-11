import { z } from 'zod';

const assetTypeEnum = z.enum(['VEHICLE', 'LAND', 'BUILDING', 'FURNITURE', 'COMPUTER', 'MACHINERY', 'OFFICE_EQUIPMENT', 'WAREHOUSE_EQUIPMENT', 'OTHER']);
const depreciationMethodEnum = z.enum(['STRAIGHT_LINE', 'WRITTEN_DOWN_VALUE', 'CUSTOM']);

export const listAssetCategoriesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ isActive: z.enum(['true', 'false']).optional() }),
});

export const assetCategoryIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid category id') }),
});

export const createAssetCategorySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    code: z.string().min(1, 'Code is required').toUpperCase(),
    name: z.string().min(1, 'Name is required'),
    assetType: assetTypeEnum,
    usefulLifeMonths: z.number().int().positive('Useful life must be greater than 0'),
    depreciationMethod: depreciationMethodEnum.optional(),
    depreciationRatePercent: z.number().min(0).max(100).optional(),
    residualValuePercent: z.number().min(0).max(100).optional(),
  }),
});

export const updateAssetCategorySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid category id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    usefulLifeMonths: z.number().int().positive().optional(),
    depreciationMethod: depreciationMethodEnum.optional(),
    depreciationRatePercent: z.number().min(0).max(100).optional(),
    residualValuePercent: z.number().min(0).max(100).optional(),
  }),
});

export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>['body'];
export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategorySchema>['body'];
