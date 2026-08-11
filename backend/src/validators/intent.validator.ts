import { z } from 'zod';

const INTENT_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'CONVERTED', 'REJECTED', 'CANCELLED'] as const;

export const listIntentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    companyId: z.string().uuid().optional(),
    status: z.enum(INTENT_STATUSES).optional(),
  }),
});

export const intentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid intent id') }),
});

const intentChargeFields = {
  poNumber: z.string().optional(),
  packages: z.number().int().positive().optional(),
  volumeCbm: z.number().positive().optional(),
  loadMode: z.enum(['FULL', 'PART']).optional(),
  podRequired: z.boolean().optional(),
  insuranceRequired: z.boolean().optional(),
  baseFreightAmount: z.number().nonnegative().optional(),
  tollCharges: z.number().nonnegative().optional(),
  loadingCharges: z.number().nonnegative().optional(),
  otherCharges: z.number().nonnegative().optional(),
};

export const createIntentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    companyId: z.string().uuid('A valid company is required'),
    fromLocationId: z.string().uuid('A valid origin location is required'),
    toLocationId: z.string().uuid('A valid destination location is required'),
    materialId: z.string().uuid().optional(),
    vehicleTypeId: z.string().uuid().optional(),
    quantityTon: z.number().positive().optional(),
    expectedPickupDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
    freightAmount: z.number().nonnegative().optional(),
    remarks: z.string().optional(),
    ...intentChargeFields,
  }),
});

export const updateIntentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid intent id') }),
  body: z.object({
    fromLocationId: z.string().uuid().optional(),
    toLocationId: z.string().uuid().optional(),
    materialId: z.string().uuid().optional(),
    vehicleTypeId: z.string().uuid().optional(),
    quantityTon: z.number().positive().optional(),
    expectedPickupDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
    freightAmount: z.number().nonnegative().optional(),
    remarks: z.string().optional(),
    ...intentChargeFields,
  }),
});

export const approveIntentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid intent id') }),
  body: z.object({
    opsAmount: z.number().positive('Operation amount is required'),
    fleetType: z.enum(['OWN', 'MARKET'], {
      errorMap: () => ({ message: 'Choose whether this goes to the Own Vehicle or Market Vehicle team' }),
    }),
  }),
});

export const rejectIntentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid intent id') }),
  body: z.object({
    rejectionReason: z.string().min(1, 'A rejection reason is required'),
  }),
});

export const cancelIntentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid intent id') }),
  body: z.object({
    remarks: z.string().optional(),
  }),
});

export type CreateIntentInput = z.infer<typeof createIntentSchema>['body'];
export type UpdateIntentInput = z.infer<typeof updateIntentSchema>['body'];
