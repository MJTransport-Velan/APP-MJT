import { z } from 'zod';

export const listPermissionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    search: z.string().optional(),
    module: z.string().optional(),
  }),
});
