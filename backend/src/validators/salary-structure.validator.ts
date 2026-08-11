import { z } from 'zod';

const componentTypeEnum = z.enum([
  'BASIC',
  'HRA',
  'DA',
  'SPECIAL_ALLOWANCE',
  'TRAVEL_ALLOWANCE',
  'MEDICAL_ALLOWANCE',
  'PF',
  'ESI',
  'PROFESSIONAL_TAX',
  'TDS',
  'OTHER_DEDUCTION',
  'BONUS',
  'ARREARS',
  'LEAVE_DEDUCTION',
  'ATTENDANCE_DEDUCTION',
  'OVERTIME',
  'RECOVERY',
  'MANUAL_ADJUSTMENT',
  'CUSTOM',
]);
const calculationTypeEnum = z.enum(['FIXED_AMOUNT', 'PERCENT_OF_BASIC', 'PERCENT_OF_GROSS']);

export const employeeIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ employeeId: z.string().uuid('Invalid employee id') }),
});

export const salaryStructureIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid salary structure id') }),
});

export const createSalaryStructureSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    employeeId: z.string().uuid('A valid employee is required'),
    effectiveFrom: z.string().min(1, 'Effective date is required'),
    components: z
      .array(
        z.object({
          componentType: componentTypeEnum,
          name: z.string().optional(),
          calculationType: calculationTypeEnum.optional(),
          value: z.number(),
          isEarning: z.boolean(),
          targetLedgerId: z.string().uuid().optional(),
        })
      )
      .min(1, 'At least one component is required'),
  }),
});

export type CreateSalaryStructureInput = z.infer<typeof createSalaryStructureSchema>['body'];
