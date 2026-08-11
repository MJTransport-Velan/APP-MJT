import { z } from 'zod';

const driverAdvanceTypeEnum = z.enum([
  'SALARY_ADVANCE',
  'TRIP_ADVANCE',
  'EMERGENCY_ADVANCE',
  'FUEL_ADVANCE',
  'TOLL_ADVANCE',
  'REPAIR_ADVANCE',
  'MEDICAL_ADVANCE',
  'ADVANCE_AGAINST_SALARY',
  'ADVANCE_AGAINST_TRIP',
  'OTHER',
]);

export const listDriverAdvancesSchema = z.object({
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

export const driverAdvanceIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid advance id') }),
});

export const createDriverAdvanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    driverId: z.string().uuid('A valid driver is required'),
    tripId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    advanceType: driverAdvanceTypeEnum,
    purpose: z.string().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    paymentModeId: z.string().uuid().optional(),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export const rejectDriverAdvanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid advance id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type CreateDriverAdvanceInput = z.infer<typeof createDriverAdvanceSchema>['body'];
