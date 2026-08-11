import { z } from 'zod';

const periodTypeEnum = z.enum(['MONTHLY', 'WEEKLY', 'DAILY_WAGE', 'CONTRACT']);
const runTypeEnum = z.enum(['REGULAR', 'FINAL_SETTLEMENT', 'EXIT']);

export const listPayrollRunsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(['DRAFT', 'CALCULATED', 'VERIFIED', 'APPROVED', 'PROCESSED', 'PAID', 'CANCELLED']).optional(),
  }),
});

export const payrollRunIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid payroll run id') }),
});

export const createPayrollRunSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    periodType: periodTypeEnum,
    periodStart: z.string().min(1, 'Period start date is required'),
    periodEnd: z.string().min(1, 'Period end date is required'),
    runType: runTypeEnum.optional(),
  }),
});

export const calculatePayrollRunSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid payroll run id') }),
  body: z.object({ employeeIds: z.array(z.string().uuid()).optional() }),
});

export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>['body'];
