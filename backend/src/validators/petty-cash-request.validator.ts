import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const listPettyCashRequestsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    organizationId: z.string().uuid().optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED']).optional(),
    cashAccountId: z.string().uuid().optional(),
  }),
});

export const pettyCashRequestIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
});

export const createPettyCashRequestSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    organizationId: z.string().uuid().optional(),
    cashAccountId: z.string().uuid('cashAccountId is required'),
    amount: z.number().positive('Amount must be greater than 0'),
    purpose: z.string().min(1, 'Purpose is required'),
  }),
});

export const decidePettyCashRequestSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    remarks: z.string().optional(),
  }),
});

export const disbursePettyCashRequestSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    fromBankAccountId: z.string().uuid('fromBankAccountId is required'),
    transferDate: isoDate.optional(),
  }),
});

export const closePettyCashRequestSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    settledAmount: z.number().min(0),
  }),
});

export type CreatePettyCashRequestInput = z.infer<typeof createPettyCashRequestSchema>['body'];
export type DisbursePettyCashRequestInput = z.infer<typeof disbursePettyCashRequestSchema>['body'];
export type ClosePettyCashRequestInput = z.infer<typeof closePettyCashRequestSchema>['body'];
