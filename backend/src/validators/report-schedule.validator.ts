import { z } from 'zod';

export const listReportSchedulesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ isActive: z.enum(['true', 'false']).optional(), category: z.string().optional() }),
});

export const reportScheduleIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid schedule id') }),
});

export const createReportScheduleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    reportKey: z.string().min(1, 'reportKey is required'),
    category: z.string().min(1, 'Category is required'),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']),
    format: z.enum(['PDF', 'EXCEL', 'CSV']).optional(),
    recipientEmails: z.string().optional(),
  }),
});

export const updateReportScheduleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid schedule id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']).optional(),
    format: z.enum(['PDF', 'EXCEL', 'CSV']).optional(),
    recipientEmails: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateReportScheduleInput = z.infer<typeof createReportScheduleSchema>['body'];
export type UpdateReportScheduleInput = z.infer<typeof updateReportScheduleSchema>['body'];
