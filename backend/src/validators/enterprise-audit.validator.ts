import { z } from 'zod';

export const auditQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
    method: z.string().optional(),
    minStatus: z.string().optional(),
  }),
});
