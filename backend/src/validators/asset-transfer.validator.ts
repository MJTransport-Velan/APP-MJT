import { z } from 'zod';

export const listAssetTransfersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    assetId: z.string().uuid().optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }),
});

export const assetTransferIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid transfer id') }),
});

export const requestAssetTransferSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    assetId: z.string().uuid('A valid asset is required'),
    transferType: z.enum(['DEPARTMENT', 'CUSTODY', 'LOCATION']),
    toDepartmentId: z.string().uuid().optional(),
    toResponsiblePersonId: z.string().uuid().optional(),
    transferDate: z.string().min(1, 'Transfer date is required'),
    reason: z.string().optional(),
  }),
});

export const rejectAssetTransferSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid transfer id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type RequestAssetTransferInput = z.infer<typeof requestAssetTransferSchema>['body'];
