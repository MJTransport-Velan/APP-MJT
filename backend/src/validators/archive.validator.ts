import { z } from 'zod';

const scopeEnum = z.enum(['AUDIT_LOG', 'ACTIVITY_LOG', 'API_REQUEST_LOG', 'WEBHOOK_DELIVERY']);

export const listArchiveRunsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ page: z.string().optional(), pageSize: z.string().optional(), scope: scopeEnum.optional() }),
});

export const runArchiveSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    scope: scopeEnum,
    cutoffDays: z.number().int().min(1, 'cutoffDays must be at least 1'),
  }),
});

export type RunArchiveInput = z.infer<typeof runArchiveSchema>['body'];
