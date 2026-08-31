import { z } from 'zod';

export const listNotificationsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    isRead: z.enum(['true', 'false']).optional(),
  }),
});

export const notificationIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid notification id') }),
});

const leadDays = z
  .string()
  .regex(/^\d+$/, 'leadDays must be a whole number of days')
  .refine((v) => Number(v) >= 1 && Number(v) <= 90, 'leadDays must be between 1 and 90')
  .optional();

export const dueRemindersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ leadDays }),
});

export const runDueReminderScanSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ leadDays }),
});
