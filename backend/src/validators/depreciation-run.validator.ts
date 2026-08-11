import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const listDepreciationRunsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    status: z.enum(['DRAFT', 'CALCULATED', 'APPROVED']).optional(),
  }),
});

export const depreciationRunIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid run id') }),
});

export const createDepreciationRunSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    periodType: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
    periodStart: isoDate,
    periodEnd: isoDate,
  }),
});

export type CreateDepreciationRunInput = z.infer<typeof createDepreciationRunSchema>['body'];
