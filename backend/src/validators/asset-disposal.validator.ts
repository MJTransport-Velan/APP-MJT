import { z } from 'zod';

const disposalTypeEnum = z.enum(['SALE', 'SCRAP', 'WRITE_OFF', 'THEFT', 'ACCIDENT_TOTAL_LOSS', 'DONATION']);

export const listAssetDisposalsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    disposalType: disposalTypeEnum.optional(),
  }),
});

export const assetDisposalIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid disposal id') }),
});

export const raiseAssetDisposalSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    assetId: z.string().uuid('A valid asset is required'),
    disposalType: disposalTypeEnum,
    disposalDate: z.string().min(1, 'Disposal date is required'),
    saleValue: z.number().min(0).optional(),
    buyerDetails: z.string().optional(),
    insuranceClaimId: z.string().uuid().optional(),
    exchangeGroupId: z.string().optional(),
  }),
});

export const approveAssetDisposalSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid disposal id') }),
  body: z.object({
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export const rejectAssetDisposalSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid disposal id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type RaiseAssetDisposalInput = z.infer<typeof raiseAssetDisposalSchema>['body'];
export type ApproveAssetDisposalInput = z.infer<typeof approveAssetDisposalSchema>['body'];
