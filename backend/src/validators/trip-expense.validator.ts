import { z } from 'zod';

export const listTripExpensesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    tripId: z.string().uuid().optional(),
    category: z.enum(['FUEL', 'DRIVER_BATA', 'TOLL', 'LOADING', 'UNLOADING', 'MISCELLANEOUS']).optional(),
  }),
});

export const tripExpenseIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid expense id') }),
});

export const createTripExpenseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    tripId: z.string().uuid('A valid trip is required'),
    category: z.enum(['FUEL', 'DRIVER_BATA', 'TOLL', 'LOADING', 'UNLOADING', 'MISCELLANEOUS']),
    amount: z.number().positive('Amount must be greater than 0'),
    expenseDate: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const updateTripExpenseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid expense id') }),
  body: z.object({
    category: z.enum(['FUEL', 'DRIVER_BATA', 'TOLL', 'LOADING', 'UNLOADING', 'MISCELLANEOUS']).optional(),
    amount: z.number().positive().optional(),
    expenseDate: z.string().optional(),
    description: z.string().optional(),
  }),
});

export type CreateTripExpenseInput = z.infer<typeof createTripExpenseSchema>['body'];
export type UpdateTripExpenseInput = z.infer<typeof updateTripExpenseSchema>['body'];
