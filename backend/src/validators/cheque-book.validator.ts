import { z } from 'zod';

export const listChequeBooksSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    organizationId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const chequeBookIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
});

export const createChequeBookSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    organizationId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid('bankAccountId is required'),
    bookNumber: z.string().min(1, 'Book number is required'),
    startNumber: z.string().min(1, 'Start number is required'),
    endNumber: z.string().min(1, 'End number is required'),
    totalLeaves: z.number().int().positive().optional(),
  }),
});

export type CreateChequeBookInput = z.infer<typeof createChequeBookSchema>['body'];
