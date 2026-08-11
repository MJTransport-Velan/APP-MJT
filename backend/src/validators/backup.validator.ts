import { z } from 'zod';

export const listBackupsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ page: z.string().optional(), pageSize: z.string().optional() }),
});

export const backupIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid backup id') }),
});
