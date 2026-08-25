import { z } from 'zod';

const depreciationMethodEnum = z.enum(['STRAIGHT_LINE', 'WRITTEN_DOWN_VALUE', 'CUSTOM']);
const fixedAssetStatusEnum = z.enum(['ACTIVE', 'WRITTEN_OFF']);

export const listFixedAssetsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    status: fixedAssetStatusEnum.optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }),
});

export const fixedAssetIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid asset id') }),
});

export const createFixedAssetSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    assetName: z.string().min(1, 'Asset name is required'),
    categoryId: z.string().uuid('A valid asset category is required'),
    vehicleId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    purchaseDate: z.string().min(1, 'Purchase date is required'),
    capitalizationDate: z.string().optional(),
    purchaseValue: z.number().positive('Purchase value must be greater than 0'),
    residualValue: z.number().min(0).optional(),
    currentValue: z.number().min(0).optional(),
    usefulLifeMonths: z.number().int().positive().optional(),
    depreciationMethod: depreciationMethodEnum.optional(),
    departmentId: z.string().uuid().optional(),
    locationText: z.string().optional(),
    responsiblePersonId: z.string().uuid().optional(),
  }),
});

export const updateFixedAssetSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid asset id') }),
  body: z
    .object({
      assetName: z.string().min(1, 'Asset name is required').optional(),
      categoryId: z.string().uuid().optional(),
      vehicleId: z.string().uuid().nullable().optional(),
      supplierId: z.string().uuid().nullable().optional(),
      purchaseDate: z.string().min(1).optional(),
      capitalizationDate: z.string().min(1).optional(),
      purchaseValue: z.number().positive('Purchase value must be greater than 0').optional(),
      residualValue: z.number().min(0).optional(),
      currentValue: z.number().min(0).optional(),
      usefulLifeMonths: z.number().int().positive().optional(),
      depreciationMethod: depreciationMethodEnum.optional(),
      departmentId: z.string().uuid().nullable().optional(),
      locationText: z.string().nullable().optional(),
      responsiblePersonId: z.string().uuid().nullable().optional(),
      status: fixedAssetStatusEnum.optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' }),
});

const fundingLineSchema = z.object({
  type: z.enum(['BANK', 'CASH', 'SUPPLIER']),
  amount: z.number().positive('Amount must be greater than 0'),
  fundAccountId: z.string().uuid().optional(),
});

export const approveFixedAssetSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid asset id') }),
  body: z.object({
    fundingLines: z.array(fundingLineSchema).min(1, 'At least one funding line is required'),
  }),
});

export const rejectFixedAssetSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid asset id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type CreateFixedAssetInput = z.infer<typeof createFixedAssetSchema>['body'];
export type UpdateFixedAssetInput = z.infer<typeof updateFixedAssetSchema>['body'];
export type ApproveFixedAssetInput = z.infer<typeof approveFixedAssetSchema>['body'];
