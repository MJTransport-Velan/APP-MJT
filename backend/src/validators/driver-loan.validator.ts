import { z } from 'zod';

const loanTypeEnum = z.enum(['PERSONAL', 'EMERGENCY', 'VEHICLE', 'FESTIVAL', 'MEDICAL']);

export const listDriverLoansSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    driverId: z.string().uuid().optional(),
    status: z.enum(['PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'REJECTED', 'WRITTEN_OFF']).optional(),
  }),
});

export const driverLoanIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
});

export const createDriverLoanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    driverId: z.string().uuid('A valid driver is required'),
    loanType: loanTypeEnum,
    principalAmount: z.number().positive('Principal must be greater than 0'),
    tenureMonths: z.number().int().min(1, 'Tenure must be at least 1 month').max(120, 'Tenure cannot exceed 120 months'),
  }),
});

export const rejectDriverLoanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type CreateDriverLoanInput = z.infer<typeof createDriverLoanSchema>['body'];
