import { z } from 'zod';

const categoryEnum = z.enum(['FUEL', 'REPAIR', 'TYRE', 'BATTERY', 'PARKING', 'TOLL', 'FOOD', 'ACCOMMODATION', 'MEDICAL', 'PHONE', 'MISCELLANEOUS']);

export const listDriverReimbursementsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    driverId: z.string().uuid().optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    isSettled: z.enum(['true', 'false']).optional(),
  }),
});

export const driverReimbursementIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid reimbursement id') }),
});

export const createDriverReimbursementSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    driverId: z.string().uuid('A valid driver is required'),
    tripId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    category: categoryEnum,
    amount: z.number().positive('Amount must be greater than 0'),
    expenseDate: z.string().optional(),
    description: z.string().optional(),
    receiptDocument: z.string().optional(),
  }),
});

export const rejectDriverReimbursementSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid reimbursement id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type CreateDriverReimbursementInput = z.infer<typeof createDriverReimbursementSchema>['body'];
