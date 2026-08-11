import { z } from 'zod';

const complianceTypeEnum = z.enum(['INSURANCE', 'PERMIT', 'FITNESS', 'ROAD_TAX', 'POLLUTION']);

export const listComplianceRecordsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    complianceType: complianceTypeEnum.optional(),
  }),
});

export const expiringComplianceSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ days: z.string().optional() }),
});

export const complianceRecordIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid record id') }),
});

export const createComplianceRecordSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    complianceType: complianceTypeEnum,
    documentNumber: z.string().min(1, 'Document number is required'),
    issuerName: z.string().optional(),
    issueDate: z.string().min(1, 'Issue date is required'),
    expiryDate: z.string().min(1, 'Expiry date is required'),
    premiumOrFeeAmount: z.number().min(0).optional(),
    documentUrl: z.string().optional(),
    renewedFromId: z.string().uuid().optional(),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export const fileClaimSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid record id') }),
  body: z.object({
    claimNumber: z.string().min(1, 'Claim number is required'),
    claimDate: z.string().min(1, 'Claim date is required'),
    claimAmount: z.number().positive('Claim amount must be greater than 0'),
  }),
});

export const settleClaimSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ claimId: z.string().uuid('Invalid claim id') }),
  body: z.object({
    status: z.enum(['APPROVED', 'SETTLED', 'REJECTED']),
    settledAmount: z.number().min(0).optional(),
  }),
});

export type CreateComplianceRecordInput = z.infer<typeof createComplianceRecordSchema>['body'];
export type FileClaimInput = z.infer<typeof fileClaimSchema>['body'];
export type SettleClaimInput = z.infer<typeof settleClaimSchema>['body'];
