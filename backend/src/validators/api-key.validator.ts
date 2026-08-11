import { z } from 'zod';

export const createApiKeySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    scopes: z.array(z.string()).min(1, 'At least one scope is required'),
    rateLimitPerMinute: z.number().int().min(1).optional(),
    expiresAt: z.string().optional(),
  }),
});

export const apiKeyIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid API key id') }),
});
