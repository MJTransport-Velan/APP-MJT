import { z } from 'zod';

const categoryEnum = z.enum(['GENERAL', 'ACCOUNTING', 'NOTIFICATION', 'WORKFLOW', 'BACKUP', 'SECURITY', 'API']);

export const listSystemSettingsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ category: categoryEnum.optional() }),
});

export const setSystemSettingSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    category: categoryEnum,
    key: z.string().min(1, 'Key is required'),
    value: z.string(),
    description: z.string().optional(),
  }),
});

export type SetSystemSettingInput = z.infer<typeof setSystemSettingSchema>['body'];
