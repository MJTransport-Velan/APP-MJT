import { z } from 'zod';

const fundAccountTypeEnum = z.enum(['BANK', 'CASH']);
// CONTRIBUTION/WITHDRAWAL move owner EQUITY; OWNER_LOAN_* move an owner
// LIABILITY the business owes back. Keeping them apart is the point of the
// Capital & Owner Funds screen (spec §9–§12).
const capitalTransactionTypeEnum = z.enum(['CONTRIBUTION', 'WITHDRAWAL', 'OWNER_LOAN_RECEIVED', 'OWNER_LOAN_REPAYMENT']);

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

export const updateCapitalTransactionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    type: capitalTransactionTypeEnum.optional(),
    amount: z.number().positive('Amount must be greater than 0').optional(),
    transactionDate: z.string().optional(),
    fundAccountType: fundAccountTypeEnum.optional(),
    fundAccountId: z.string().uuid().optional(),
    remarks: z.string().optional(),
  }).strict(),
});

export type CreateCapitalTransactionInput = z.infer<typeof createCapitalTransactionSchema>['body'];
export type UpdateCapitalTransactionInput = z.infer<typeof updateCapitalTransactionSchema>['body'];
