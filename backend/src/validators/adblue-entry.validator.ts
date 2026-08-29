import { z } from 'zod';

const sourceEnum = z.enum(['FROM_STOCK', 'DIRECT_PURCHASE']);

export const listAdBlueEntriesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    tripId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    source: sourceEnum.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const adBlueEntryIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid AdBlue entry id') }),
});

/**
 * One AdBlue top-up of one truck.
 *
 * FROM_STOCK needs only the litres poured in: the cost comes from the
 * store's own weighted-average rate, so a rate or amount typed here would
 * be silently overruled and is rejected instead of being quietly ignored.
 *
 * DIRECT_PURCHASE is a roadside bill, so it follows the fuel-entry rule —
 * the amount paid, the litres, or both; rate alone says nothing about the
 * size of the top-up.
 *
 * Driver is deliberately not client-settable: it always comes from
 * whichever trip the truck was on, never picked by hand.
 */
export const createAdBlueEntrySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    source: sourceEnum,
    location: z.string().optional(),
    tripId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    paymentModeId: z.string().uuid().optional(),
    quantityLiters: z.number().positive('Quantity must be greater than 0').optional(),
    ratePerLiter: z.number().positive('Rate per litre must be greater than 0').optional(),
    totalAmount: z.number().positive('Amount must be greater than 0').optional(),
    odometerReading: z.number().int().positive('Meter reading must be a positive number').optional(),
    invoiceNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
    entryDate: z.string().optional(),
  })
    .refine((body) => body.source !== 'FROM_STOCK' || body.quantityLiters != null, {
      message: 'Enter how many litres were taken from stock',
      path: ['quantityLiters'],
    })
    .refine((body) => body.source !== 'DIRECT_PURCHASE' || body.totalAmount != null || body.quantityLiters != null, {
      message: 'Enter the amount paid, the quantity, or both',
      path: ['totalAmount'],
    }),
});

export const updateAdBlueEntrySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid AdBlue entry id') }),
  body: z.object({
    // Editable because it decides whether the top-up draws on the store at
    // all — a stock issue corrected to a roadside buy, or the reverse.
    source: sourceEnum.optional(),
    location: z.string().optional(),
    tripId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    paymentModeId: z.string().uuid().optional(),
    quantityLiters: z.number().positive().optional(),
    ratePerLiter: z.number().positive().optional(),
    totalAmount: z.number().positive().optional(),
    odometerReading: z.number().int().positive().optional(),
    invoiceNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
    entryDate: z.string().optional(),
  }),
});

const dateRangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const adBlueSummaryQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: dateRangeQuery.extend({ vehicleId: z.string().uuid().optional() }),
});

export const vehicleAdBlueSummaryQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ vehicleId: z.string().uuid('Invalid vehicle id') }),
  query: dateRangeQuery.optional(),
});

export const vehicleAdBlueConsumptionQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: dateRangeQuery,
});

export type CreateAdBlueEntryInput = z.infer<typeof createAdBlueEntrySchema>['body'];
export type UpdateAdBlueEntryInput = z.infer<typeof updateAdBlueEntrySchema>['body'];
