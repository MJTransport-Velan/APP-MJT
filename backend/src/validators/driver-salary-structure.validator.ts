import { z } from 'zod';

export const driverIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ driverId: z.string().uuid('Invalid driver id') }),
});

export const driverSalaryStructureIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid salary structure id') }),
});

export const createDriverSalaryStructureSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.discriminatedUnion('salaryType', [
    z.object({
      driverId: z.string().uuid('A valid driver is required'),
      salaryType: z.literal('FIXED'),
      fixedAmount: z.number().positive('Fixed amount must be greater than zero'),
      effectiveFrom: z.string().min(1, 'Effective date is required'),
    }),
    z.object({
      driverId: z.string().uuid('A valid driver is required'),
      salaryType: z.literal('PERCENT_OF_FREIGHT'),
      percentValue: z.number().positive('Percentage must be greater than zero').max(100, 'Percentage cannot exceed 100'),
      effectiveFrom: z.string().min(1, 'Effective date is required'),
    }),
  ]),
});

export type CreateDriverSalaryStructureInput = z.infer<typeof createDriverSalaryStructureSchema>['body'];
