import { z } from 'zod';

const categoryEnum = z.enum([
  'FUEL', 'MAINTENANCE', 'INSURANCE', 'PERMIT', 'MISCELLANEOUS',
  'REPAIR', 'SERVICE', 'TYRE', 'BATTERY', 'FITNESS', 'ROAD_TAX', 'FASTTAG', 'ACCESSORIES', 'GREASE_LUBRICANTS', 'BREAKDOWN',
]);

export const listExpensesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    category: categoryEnum.optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const expenseIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid expense id') }),
});

export const createExpenseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    category: categoryEnum,
    amount: z.number().positive('Amount must be greater than 0'),
    expenseDate: z.string().optional(),
    description: z.string().optional(),
    paymentModeId: z.string().uuid().optional(),
    tripId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    gstMasterId: z.string().uuid().optional(),
    taxAmount: z.number().min(0).optional(),
  }),
});

export const updateExpenseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid expense id') }),
  body: z.object({
    category: categoryEnum.optional(),
    amount: z.number().positive().optional(),
    expenseDate: z.string().optional(),
    description: z.string().optional(),
    paymentModeId: z.string().uuid().optional(),
    tripId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    gstMasterId: z.string().uuid().optional(),
    taxAmount: z.number().min(0).optional(),
  }),
});

export const approveExpenseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid expense id') }),
  body: z.object({
    settleVia: z.enum(['FUND_ACCOUNT', 'SUPPLIER']).default('FUND_ACCOUNT'),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export const rejectExpenseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid expense id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>['body'];
export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>['body'];
