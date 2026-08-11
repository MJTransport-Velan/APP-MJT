import { z } from 'zod';

export const voucherAuditQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    voucherId: z.string().uuid().optional(),
    action: z.string().optional(),
  }),
});

export const ledgerAuditQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    ledgerId: z.string().uuid('ledgerId is required'),
  }),
});

export const transactionsQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ page: z.string().optional(), pageSize: z.string().optional(), from: z.string().optional(), to: z.string().optional() }),
});

export const approvalHistoryQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ page: z.string().optional(), pageSize: z.string().optional(), voucherId: z.string().uuid().optional() }),
});

export const userActivityQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ page: z.string().optional(), pageSize: z.string().optional(), from: z.string().optional(), to: z.string().optional(), userId: z.string().uuid().optional() }),
});
