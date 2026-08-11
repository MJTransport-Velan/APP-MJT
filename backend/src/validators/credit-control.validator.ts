import { z } from 'zod';

export const companyIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid company id') }),
});

export const setCreditControlSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid company id') }),
  body: z.object({
    creditLimit: z.number().min(0).nullable().optional(),
    creditDays: z.number().int().min(0).nullable().optional(),
    isBlocked: z.boolean().optional(),
    blockedReason: z.string().optional(),
  }),
});

export type SetCreditControlInput = z.infer<typeof setCreditControlSchema>['body'];
