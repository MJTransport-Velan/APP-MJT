import { z } from 'zod';

export const listSystemExceptionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']).optional(),
    errorType: z.enum(['DUPLICATE', 'NEGATIVE_BALANCE', 'MISSING_APPROVAL', 'VOUCHER_FAILURE', 'POSTING_FAILURE', 'VALIDATION_FAILURE', 'UNEXPECTED']).optional(),
    module: z.string().optional(),
  }),
});

export const systemExceptionIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid exception id') }),
});

export const resolveSystemExceptionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid exception id') }),
  body: z.object({ resolution: z.string().min(1, 'Resolution note is required') }),
});
