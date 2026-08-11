import { z } from 'zod';

const loanTypeEnum = z.enum(['PERSONAL', 'EMERGENCY', 'FESTIVAL', 'MEDICAL']);

export const listEmployeeLoansSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    status: z.enum(['PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'REJECTED', 'WRITTEN_OFF']).optional(),
  }),
});

export const employeeLoanIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
});

export const createEmployeeLoanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    employeeId: z.string().uuid('A valid employee is required'),
    loanType: loanTypeEnum,
    principalAmount: z.number().positive('Principal must be greater than 0'),
    tenureMonths: z.number().int().min(1, 'Tenure must be at least 1 month').max(120, 'Tenure cannot exceed 120 months'),
  }),
});

export const rejectEmployeeLoanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type CreateEmployeeLoanInput = z.infer<typeof createEmployeeLoanSchema>['body'];
