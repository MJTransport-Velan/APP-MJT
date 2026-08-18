import { z } from 'zod';

const fuelTypeEnum = z.enum(['DIESEL', 'PETROL', 'CNG', 'OTHER']);
const billingMethodEnum = z.enum(['FUEL_CARD', 'OTP', 'DIRECT_PAYMENT']);

export const listFuelEntriesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    tripId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    fuelType: fuelTypeEnum.optional(),
    billingMethod: billingMethodEnum.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const fuelEntryIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid fuel entry id') }),
});

// Driver is deliberately not a client-settable field — it's always derived
// from whichever trip the vehicle was on (explicit tripId, or auto-detected
// from vehicleId + entryDate), never picked manually.
export const createFuelEntrySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    fuelCardId: z.string().uuid().optional(),
    fuelType: fuelTypeEnum.optional(),
    billingMethod: billingMethodEnum.optional(),
    location: z.string().optional(),
    tripId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    paymentModeId: z.string().uuid().optional(),
    advanceId: z.string().uuid().optional(),
    quantityLiters: z.number().positive('Fuel quantity must be greater than 0'),
    ratePerLiter: z.number().positive('Rate per liter must be greater than 0'),
    odometerReading: z.number().int().positive('Meter reading must be a positive number'),
    invoiceNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
    entryDate: z.string().optional(),
  }),
});

export const updateFuelEntrySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid fuel entry id') }),
  body: z.object({
    fuelType: fuelTypeEnum.optional(),
    billingMethod: billingMethodEnum.optional(),
    location: z.string().optional(),
    tripId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    paymentModeId: z.string().uuid().optional(),
    advanceId: z.string().uuid().optional(),
    quantityLiters: z.number().positive().optional(),
    ratePerLiter: z.number().positive().optional(),
    invoiceNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
    entryDate: z.string().optional(),
  }),
});

export const vehicleFuelSummaryQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ vehicleId: z.string().uuid('Invalid vehicle id') }),
  query: z.object({}).optional(),
});

export type CreateFuelEntryInput = z.infer<typeof createFuelEntrySchema>['body'];
export type UpdateFuelEntryInput = z.infer<typeof updateFuelEntrySchema>['body'];
