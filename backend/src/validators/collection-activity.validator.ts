import { z } from 'zod';

const activityTypeEnum = z.enum(['CALL', 'EMAIL', 'REMINDER', 'PROMISE_TO_PAY', 'NOTE']);

export const listCollectionActivitiesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    companyId: z.string().uuid().optional(),
    invoiceId: z.string().uuid().optional(),
  }),
});

export const createCollectionActivitySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    companyId: z.string().uuid('A valid company is required'),
    invoiceId: z.string().uuid().optional(),
    activityType: activityTypeEnum,
    notes: z.string().optional(),
    promisedAmount: z.number().positive().optional(),
    promisedDate: z.string().optional(),
    followUpDate: z.string().optional(),
  }),
});

export type CreateCollectionActivityInput = z.infer<typeof createCollectionActivitySchema>['body'];
