import { z } from 'zod';

const earningCategoryEnum = z.enum(['ALLOWANCE', 'INCENTIVE']);
const earningTypeEnum = z.enum([
  'TRIP_BATA',
  'DAILY_BATA',
  'NIGHT_BATA',
  'LOADING_ALLOWANCE',
  'UNLOADING_ALLOWANCE',
  'WAITING_CHARGES',
  'OUTSTATION_ALLOWANCE',
  'FOOD_ALLOWANCE',
  'SPECIAL_ALLOWANCE',
  'TRIP_INCENTIVE',
  'MONTHLY_INCENTIVE',
  'FUEL_SAVING_INCENTIVE',
  'ON_TIME_DELIVERY_INCENTIVE',
  'PERFORMANCE_BONUS',
  'TARGET_INCENTIVE',
  'FESTIVAL_BONUS',
  'REFERRAL_BONUS',
  'CUSTOM',
]);
const calculationTypeEnum = z.enum(['FIXED_PER_TRIP', 'PER_KM', 'PER_DAY', 'PERCENT_OF_FREIGHT']);

export const listDriverEarningsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    driverId: z.string().uuid().optional(),
    earningCategory: earningCategoryEnum.optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    isSettled: z.enum(['true', 'false']).optional(),
  }),
});

export const driverEarningIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid earning id') }),
});

export const createDriverEarningSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    driverId: z.string().uuid('A valid driver is required'),
    tripId: z.string().uuid().optional(),
    earningCategory: earningCategoryEnum,
    earningType: earningTypeEnum,
    name: z.string().optional(),
    amount: z.number().positive().optional(),
    ruleId: z.string().uuid().optional(),
    requiresApproval: z.boolean().optional(),
  }),
});

export const rejectDriverEarningSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid earning id') }),
  body: z.object({ reason: z.string().optional() }),
});

export const createDriverEarningRuleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    earningCategory: earningCategoryEnum,
    earningType: earningTypeEnum,
    calculationType: calculationTypeEnum,
    value: z.number().positive('Value must be greater than 0'),
    vehicleTypeId: z.string().uuid().optional(),
  }),
});

export const updateDriverEarningRuleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid rule id') }),
  body: z.object({
    calculationType: calculationTypeEnum.optional(),
    value: z.number().positive().optional(),
    vehicleTypeId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const driverEarningRuleIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid rule id') }),
});

export type CreateDriverEarningInput = z.infer<typeof createDriverEarningSchema>['body'];
export type CreateDriverEarningRuleInput = z.infer<typeof createDriverEarningRuleSchema>['body'];
export type UpdateDriverEarningRuleInput = z.infer<typeof updateDriverEarningRuleSchema>['body'];
