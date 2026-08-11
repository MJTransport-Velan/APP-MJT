import { z } from 'zod';

const penaltyTypeEnum = z.enum([
  'FUEL_RECOVERY',
  'DAMAGE_RECOVERY',
  'ACCIDENT_RECOVERY',
  'LATE_DELIVERY_PENALTY',
  'TRAFFIC_FINE',
  'ADVANCE_RECOVERY',
  'LOAN_RECOVERY',
  'UNIFORM_RECOVERY',
  'OTHER',
]);

export const listDriverPenaltiesSchema = z.object({
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

export const driverPenaltyIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid penalty id') }),
});

export const createDriverPenaltySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    driverId: z.string().uuid('A valid driver is required'),
    tripId: z.string().uuid().optional(),
    penaltyType: penaltyTypeEnum,
    amount: z.number().positive('Amount must be greater than 0'),
    reason: z.string().min(1, 'A reason is required'),
  }),
});

export const rejectDriverPenaltySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid penalty id') }),
  body: z.object({ reason: z.string().optional() }),
});

export type CreateDriverPenaltyInput = z.infer<typeof createDriverPenaltySchema>['body'];
