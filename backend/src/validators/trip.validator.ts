import { z } from 'zod';

const TRIP_STATUSES = [
  'DRAFT', 'PLANNED', 'APPROVED', 'ASSIGNED', 'STARTED', 'LOADING',
  'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING', 'COMPLETED', 'CANCELLED',
] as const;

export const listTripsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    intentId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    status: z.enum(TRIP_STATUSES).optional(),
    statusIn: z.string().optional(),
    vehicleOwnership: z.enum(['OWN', 'MARKET']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }),
});

export const availableResourcesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    excludeTripId: z.string().uuid().optional(),
  }),
});

export const tripIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid trip id') }),
});

export const createTripSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    intentId: z.string().uuid('A valid intent is required'),
    routeId: z.string().uuid().optional(),
    freightAmount: z.number().nonnegative().optional(),
    loadWeight: z.number().positive().optional(),
    loadDescription: z.string().optional(),
    scheduledStartDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
    podRequired: z.boolean().optional(),
  }),
});

export const updateTripSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid trip id') }),
  body: z.object({
    routeId: z.string().uuid().optional(),
    freightAmount: z.number().nonnegative().optional(),
    loadWeight: z.number().positive().optional(),
    loadDescription: z.string().optional(),
    scheduledStartDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
    podRequired: z.boolean().optional(),
  }),
});

export const assignTripSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid trip id') }),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    driverId: z.string().uuid('A valid driver is required'),
  }),
});

export const allocateAssetSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid trip id') }),
  body: z.discriminatedUnion('allocationType', [
    z.object({
      allocationType: z.literal('OWN_FLEET'),
      vehicleId: z.string().uuid('A valid vehicle is required'),
      driverId: z.string().uuid('A valid driver is required'),
      clientAdvance: z.number().positive().optional(),
    }),
    z.object({
      allocationType: z.literal('MARKET_TRUCK'),
      supplierId: z.string().uuid('A valid market vendor is required'),
      marketVehicleNumber: z.string().optional(),
      marketDriverName: z.string().optional(),
      marketDriverContact: z.string().min(1, 'Driver contact is required'),
      tripAmount: z.number().positive('Trip amount is required'),
      clientAdvance: z.number().positive().optional(),
      supplierAdvance: z.number().positive().optional(),
    }),
  ]),
});

export const updateTripStatusSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid trip id') }),
  body: z.object({
    status: z.enum(TRIP_STATUSES),
    notes: z.string().optional(),
  }),
});

export const cancelTripSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid trip id') }),
  body: z.object({
    cancelReason: z.string().min(1, 'A cancellation reason is required'),
  }),
});

export type CreateTripInput = z.infer<typeof createTripSchema>['body'];
export type UpdateTripInput = z.infer<typeof updateTripSchema>['body'];
export type AssignTripInput = z.infer<typeof assignTripSchema>['body'];
export type AllocateAssetInput = z.infer<typeof allocateAssetSchema>['body'];
