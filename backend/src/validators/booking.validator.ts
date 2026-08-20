import { z } from 'zod';

const BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'VEHICLE_ASSIGNED',
  'LR_GENERATED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

/** Statuses an admin may advance a booking to by hand, once the LR exists. */
export const DELIVERY_STATUSES = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

const MOBILE_RE = /^[0-9+\s-]{7,15}$/;

export const listBookingsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(BOOKING_STATUSES).optional(),
    fromPlace: z.string().optional(),
    toPlace: z.string().optional(),
    pickupDate: z.string().optional(),
  }),
});

export const bookingIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid booking id') }),
});

/**
 * Public intake payload — this is the one schema reachable without a token, so
 * it is deliberately strict about lengths as well as shape.
 */
export const createBookingSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    customerName: z.string().trim().min(2, 'Customer name is required').max(120),
    mobile: z.string().trim().regex(MOBILE_RE, 'Enter a valid mobile number'),
    email: z.string().trim().email('Enter a valid email address').max(160).optional().or(z.literal('')),
    pickupAddress: z.string().trim().min(5, 'Pickup address is required').max(500),
    deliveryAddress: z.string().trim().min(5, 'Delivery address is required').max(500),
    fromPlace: z.string().trim().min(1, 'From place is required').max(120),
    toPlace: z.string().trim().min(1, 'To place is required').max(120),
    parcelType: z.string().trim().min(1, 'Parcel type is required').max(120),
    packages: z.number().int('Number of packages must be a whole number').positive('At least one package is required'),
    weight: z.number().positive('Approximate weight is required'),
    vehicleType: z.string().trim().min(1, 'Vehicle type is required').max(120),
    pickupDate: z.string().min(1, 'Pickup date is required'),
    expectedDeliveryDate: z.string().optional().or(z.literal('')),
    instructions: z.string().trim().max(1000).optional().or(z.literal('')),
  }),
});

/**
 * Confirmation also fixes the route for website bookings, whose places are free
 * text an Intent and Trip cannot use. Optional here rather than required
 * because counter bookings already carry a mapped route from the moment they
 * are keyed in; the service rejects a booking that still has neither.
 */
export const confirmBookingSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid booking id') }),
  body: z.object({
    fromLocationId: z.string().uuid('Select the pickup location').optional(),
    toLocationId: z.string().uuid('Select the delivery location').optional(),
  }),
});

/**
 * Sets or corrects the route on a booking that is already past confirmation —
 * needed for bookings confirmed before route mapping existed, and for fixing a
 * mis-mapped location later.
 */
export const updateBookingRouteSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid booking id') }),
  body: z.object({
    fromLocationId: z.string().uuid('Select the pickup location'),
    toLocationId: z.string().uuid('Select the delivery location'),
  }),
});

/**
 * Counter entry — a booking keyed in by staff for a walk-in or phone customer.
 * Unlike the public form this takes Location ids rather than free text, since
 * staff work from the masters, and it can carry the agreed price.
 */
export const createCounterBookingSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    customerName: z.string().trim().min(2, 'Customer name is required').max(120),
    mobile: z.string().trim().regex(MOBILE_RE, 'Enter a valid mobile number'),
    email: z.string().trim().email('Enter a valid email address').max(160).optional().or(z.literal('')),
    pickupAddress: z.string().trim().min(5, 'Pickup address is required').max(500),
    deliveryAddress: z.string().trim().min(5, 'Delivery address is required').max(500),
    fromLocationId: z.string().uuid('Select the pickup location'),
    toLocationId: z.string().uuid('Select the delivery location'),
    parcelType: z.string().trim().min(1, 'Parcel type is required').max(120),
    packages: z.number().int('Number of packages must be a whole number').positive('At least one package is required'),
    weight: z.number().positive('Approximate weight is required'),
    vehicleType: z.string().trim().min(1, 'Vehicle type is required').max(120),
    pickupDate: z.string().min(1, 'Pickup date is required'),
    expectedDeliveryDate: z.string().optional().or(z.literal('')),
    freightAmount: z.number().nonnegative('Freight amount cannot be negative').optional(),
    instructions: z.string().trim().max(1000).optional().or(z.literal('')),
  }),
});

export const rejectBookingSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid booking id') }),
  body: z.object({
    rejectionReason: z.string().trim().max(500).optional().or(z.literal('')),
  }),
});

/**
 * Own/Market allocation. The two branches are mutually exclusive and each
 * requires a different set of fields, so the refinements below enforce the
 * branch rather than leaving every field optional.
 */
export const assignVehicleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid booking id') }),
  body: z
    .object({
      fleetType: z.enum(['OWN', 'MARKET'], {
        errorMap: () => ({ message: 'Choose whether this is an Own Vehicle or a Market Vehicle' }),
      }),
      vehicleId: z.string().uuid('Select a vehicle').optional(),
      driverId: z.string().uuid('Select a driver').optional(),
      vehicleType: z.string().trim().max(120).optional().or(z.literal('')),
      vehicleNumber: z.string().trim().max(30).optional().or(z.literal('')),
      driverName: z.string().trim().max(120).optional().or(z.literal('')),
      driverMobile: z.string().trim().optional().or(z.literal('')),
    })
    .superRefine((val, ctx) => {
      if (val.fleetType === 'OWN') {
        if (!val.vehicleId) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vehicleId'], message: 'Select a vehicle from the fleet' });
        }
        if (!val.driverId) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['driverId'], message: 'Select a driver from the fleet' });
        }
        // Driver.phone is nullable on the master, and the LR has to carry a
        // contact number, so an override may be supplied here. Validated for
        // shape only when present.
        if (val.driverMobile && !MOBILE_RE.test(val.driverMobile)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['driverMobile'], message: 'Enter a valid driver mobile number' });
        }
        return;
      }
      if (!val.vehicleNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vehicleNumber'], message: 'Vehicle number is required' });
      }
      if (!val.driverName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['driverName'], message: 'Driver name is required' });
      }
      if (!val.driverMobile || !MOBILE_RE.test(val.driverMobile)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['driverMobile'], message: 'Enter a valid driver mobile number' });
      }
      if (!val.vehicleType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vehicleType'], message: 'Vehicle type is required' });
      }
    }),
});

export const updateBookingStatusSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid booking id') }),
  body: z.object({
    status: z.enum(DELIVERY_STATUSES, {
      errorMap: () => ({ message: 'Choose a valid delivery stage' }),
    }),
    note: z.string().trim().max(300).optional().or(z.literal('')),
  }),
});

/** Public lookups. Kept loose enough to give a clean 404 rather than a 400 on a typo'd number. */
export const trackingNumberParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    trackingNumber: z.string().trim().min(4, 'Enter a tracking number').max(30),
  }),
});

export const bookingNoParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    bookingNo: z.string().trim().min(4, 'Enter a booking number').max(30),
  }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>['body'];
export type CreateCounterBookingInput = z.infer<typeof createCounterBookingSchema>['body'];
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>['body'];
export type UpdateBookingRouteInput = z.infer<typeof updateBookingRouteSchema>['body'];
export type AssignVehicleInput = z.infer<typeof assignVehicleSchema>['body'];
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>['body'];
