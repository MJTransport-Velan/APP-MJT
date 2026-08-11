import { z } from 'zod';

export const verifyMfaSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({ token: z.string().min(6, 'A 6-digit authenticator code is required') }),
});
