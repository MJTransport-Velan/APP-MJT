import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const createBankChargeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    organizationId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid('bankAccountId is required'),
    amount: z.number().positive('Amount must be greater than 0'),
    date: isoDate,
    narration: z.string().optional(),
  }),
});

export const createInterestSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    organizationId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid('bankAccountId is required'),
    direction: z.enum(['RECEIVED', 'PAID']),
    amount: z.number().positive('Amount must be greater than 0'),
    date: isoDate,
    narration: z.string().optional(),
  }),
});

export type CreateBankChargeInput = z.infer<typeof createBankChargeSchema>['body'];
export type CreateInterestInput = z.infer<typeof createInterestSchema>['body'];
