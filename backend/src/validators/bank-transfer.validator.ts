import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const fundAccountTypeEnum = z.enum(['BANK', 'CASH']);

export const listBankTransfersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    organizationId: z.string().uuid().optional(),
  }),
});

export const bankTransferIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
});

export const createBankTransferSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    organizationId: z.string().uuid().optional(),
    transferDate: isoDate,
    fromAccountType: fundAccountTypeEnum,
    fromAccountId: z.string().uuid('fromAccountId is required'),
    toAccountType: fundAccountTypeEnum,
    toAccountId: z.string().uuid('toAccountId is required'),
    amount: z.number().positive('Amount must be greater than 0'),
    transferCharges: z.number().min(0).optional(),
    paymentModeId: z.string().uuid().optional(),
    referenceNumber: z.string().optional(),
    narration: z.string().optional(),
  }).strict(),
});

export type CreateBankTransferInput = z.infer<typeof createBankTransferSchema>['body'];
