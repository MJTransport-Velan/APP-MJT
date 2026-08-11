import { z } from 'zod';

export const listAiInsightsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    type: z.enum(['CASH_FLOW_PREDICTION', 'EXPENSE_FORECAST', 'OUTSTANDING_PREDICTION', 'DUPLICATE_VOUCHER_FLAG']).optional(),
  }),
});

export const generateInsightSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    type: z.enum(['CASH_FLOW_PREDICTION', 'EXPENSE_FORECAST', 'OUTSTANDING_PREDICTION', 'DUPLICATE_VOUCHER_FLAG']),
    periodsAhead: z.number().int().min(1).max(12).optional(),
  }),
});
