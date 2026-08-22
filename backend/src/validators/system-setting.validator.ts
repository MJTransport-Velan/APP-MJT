import { z } from 'zod';

// Must stay in step with SystemSettingCategory in schema.prisma. INTEGRATION
// was added there when IntegrationConnector was folded into settings, but was
// never mirrored here — which 422'd every request the Integration Center makes.
const categoryEnum = z.enum([
  'GENERAL',
  'ACCOUNTING',
  'NOTIFICATION',
  'WORKFLOW',
  'BACKUP',
  'SECURITY',
  'API',
  'INTEGRATION',
]);

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
