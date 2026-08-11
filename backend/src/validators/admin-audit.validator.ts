import { z } from 'zod';

export const listAuditLogsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    action: z.string().optional(),
    entityType: z.string().optional(),
    userId: z.string().uuid().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});
