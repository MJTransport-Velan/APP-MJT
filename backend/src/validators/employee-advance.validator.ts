import { z } from 'zod';

const advanceTypeEnum = z.enum(['SALARY_ADVANCE', 'EMERGENCY_ADVANCE', 'MEDICAL_ADVANCE', 'ADVANCE_AGAINST_SALARY', 'OTHER']);

export const listEmployeeAdvancesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    isSettled: z.enum(['true', 'false']).optional(),
  }),
});

export const employeeAdvanceIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid advance id') }),
});

export const createEmployeeAdvanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    employeeId: z.string().uuid('A valid employee is required'),
    advanceType: advanceTypeEnum,
    purpose: z.string().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    paymentModeId: z.string().uuid().optional(),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export const rejectEmployeeAdvanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid advance id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type CreateEmployeeAdvanceInput = z.infer<typeof createEmployeeAdvanceSchema>['body'];
