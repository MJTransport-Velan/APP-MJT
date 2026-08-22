import { z } from 'zod';

const fundAccountTypeEnum = z.enum(['BANK', 'CASH']);
const capitalTransactionTypeEnum = z.enum(['CONTRIBUTION', 'WITHDRAWAL']);

export const listCapitalTransactionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    partnerId: z.string().uuid().optional(),
    type: capitalTransactionTypeEnum.optional(),
  }),
});

export const capitalTransactionIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid transaction id') }),
});

export const partnerIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ partnerId: z.string().uuid('Invalid partner id') }),
});

export const createCapitalTransactionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    partnerId: z.string().uuid('A valid Capital Partner is required'),
    type: capitalTransactionTypeEnum,
    amount: z.number().positive('Amount must be greater than 0'),
    transactionDate: z.string().optional(),
    fundAccountType: fundAccountTypeEnum,
    fundAccountId: z.string().uuid('A valid Bank/Cash account is required'),
    remarks: z.string().optional(),
  }).strict(),
});

export type CreateCapitalTransactionInput = z.infer<typeof createCapitalTransactionSchema>['body'];
