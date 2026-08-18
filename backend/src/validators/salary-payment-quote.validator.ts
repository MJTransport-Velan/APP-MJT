import { z } from 'zod';

const periodQuery = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be in YYYY-MM format') });

export const employeeSalaryQuoteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ employeeId: z.string().uuid('Invalid employee id') }),
  query: periodQuery,
});

export const driverSalaryQuoteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ driverId: z.string().uuid('Invalid driver id') }),
  query: periodQuery,
});
