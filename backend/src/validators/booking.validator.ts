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
  body: z
    .object({
      fromLocationId: z.string().uuid('Select the pickup location'),
      toLocationId: z.string().uuid('Select the delivery location'),
    })
    .refine((val) => val.fromLocationId !== val.toLocationId, {
      message: 'Pickup and delivery locations must be different',
      path: ['toLocationId'],
    }),
});

/**
 * Counter entry — a booking keyed in by staff for a walk-in or phone customer.
 * Unlike the public form this takes Location ids rather than free text, since
 * staff work from the masters, and it can carry the agreed price.
 *
 * Every field is optional. A booking taken over the phone often starts as a
 * name and a destination, and staff need to save that immediately rather than
 * invent a weight to satisfy a form. What is *supplied* is still validated —
 * a typed mobile number must look like one — so relaxing the requirement
 * never means accepting nonsense.
 *
 * The route is still required at confirmation, which is where the booking
 * becomes an Intent; see bookingService.confirm.
 */
export const createCounterBookingSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z
    .object({
      customerName: z.string().trim().max(120).optional().or(z.literal('')),
      mobile: z.string().trim().regex(MOBILE_RE, 'Enter a valid mobile number').optional().or(z.literal('')),
      email: z.string().trim().email('Enter a valid email address').max(160).optional().or(z.literal('')),
      pickupAddress: z.string().trim().max(500).optional().or(z.literal('')),
      deliveryAddress: z.string().trim().max(500).optional().or(z.literal('')),
      fromLocationId: z.string().uuid('Select the pickup location').optional().or(z.literal('')),
      toLocationId: z.string().uuid('Select the delivery location').optional().or(z.literal('')),
      parcelType: z.string().trim().max(120).optional().or(z.literal('')),
      packages: z
        .number()
        .int('Number of packages must be a whole number')
        .nonnegative('Number of packages cannot be negative')
        .optional()
        .nullable(),
      weight: z.number().nonnegative('Weight cannot be negative').optional().nullable(),
      vehicleType: z.string().trim().max(120).optional().or(z.literal('')),
      pickupDate: z.string().optional().or(z.literal('')),
      expectedDeliveryDate: z.string().optional().or(z.literal('')),
      freightAmount: z.number().nonnegative('Freight amount cannot be negative').optional().nullable(),
      instructions: z.string().trim().max(1000).optional().or(z.literal('')),
    })
    // Only meaningful once both have been chosen — an incomplete route is now
    // a legitimate state, a contradictory one still is not.
    .refine((val) => !val.fromLocationId || !val.toLocationId || val.fromLocationId !== val.toLocationId, {
      message: 'Pickup and delivery locations must be different',
      path: ['toLocationId'],
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
 * Own/Market allocation. Every field is optional, including the branch itself:
 * a vehicle is often half-arranged — a registration number agreed but no
 * driver named yet — and staff must be able to record what they have.
 *
 * The branch still decides *where the values come from* (OWN resolves the
 * fleet masters, MARKET stores the typed text), so it is honoured when
 * present; the service falls back to the booking's existing allocation when
 * it is not. Shape is still checked on anything actually supplied.
 */
export const assignVehicleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid booking id') }),
  body: z.object({
    fleetType: z
      .enum(['OWN', 'MARKET'], {
        errorMap: () => ({ message: 'Choose whether this is an Own Vehicle or a Market Vehicle' }),
      })
      .optional(),
    vehicleId: z.string().uuid('Select a vehicle').optional().or(z.literal('')),
    driverId: z.string().uuid('Select a driver').optional().or(z.literal('')),
    vehicleType: z.string().trim().max(120).optional().or(z.literal('')),
    vehicleNumber: z.string().trim().max(30).optional().or(z.literal('')),
    // Driver.phone is nullable on the master, and the LR carries a contact
    // number, so an override may be supplied here. Shape-checked when present.
    driverName: z.string().trim().max(120).optional().or(z.literal('')),
    driverMobile: z.string().trim().regex(MOBILE_RE, 'Enter a valid driver mobile number').optional().or(z.literal('')),
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

// ----- Printed LR detail -----------------------------------------------

export const LR_TRANSPORT_MODES = ['ROAD', 'RAIL', 'AIR', 'SEA'] as const;
export const LR_FREIGHT_PAYMENTS = ['TO_PAY', 'PAID', 'TO_BE_BILLED'] as const;
export const LR_PARTIES = ['CONSIGNOR', 'CONSIGNEE', 'THIRD_PARTY'] as const;

/** Standard 15-character GSTIN: state code, PAN, entity number, Z, checksum. */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
/** The `YYYY-MM-DD` an <input type="date"> emits. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** `YYYY-MM-DDTHH:mm`, with optional seconds — what <input type="datetime-local"> emits. */
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** An optional free-text field: absent, empty, or a trimmed string within `max`. */
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

const optionalGstin = z
  .string()
  .trim()
  .toUpperCase()
  .refine((val) => GSTIN_RE.test(val), 'Enter a valid 15-character GSTIN')
  .optional()
  .or(z.literal(''));

const optionalDate = (label: string) =>
  z.string().trim().regex(DATE_RE, `Enter a valid ${label}`).optional().or(z.literal(''));

/**
 * Money on the LR. Bounded rather than merely non-negative: the document
 * prints into a fixed-width box, and a mis-keyed amount with a runaway digit
 * count would silently overflow it.
 */
const optionalAmount = (label: string) =>
  z
    .number()
    .nonnegative(`${label} cannot be negative`)
    .max(99999999.99, `${label} is too large`)
    .optional()
    .nullable();

const goodsItemSchema = z.object({
  invoiceNo: optionalText(40),
  invoiceDate: optionalDate('invoice date'),
  description: z.string().trim().min(1, 'Describe the goods').max(200),
  units: z
    .number()
    .int('Number of units must be a whole number')
    .nonnegative('Number of units cannot be negative')
    .max(999999, 'Number of units is too large'),
  goodsValue: z
    .number()
    .nonnegative('Goods value cannot be negative')
    .max(99999999.99, 'Goods value is too large'),
  ewayBillNo: optionalText(20),
  ewayBillDate: optionalDate('e-way bill date'),
});

/**
 * Everything the printed Lorry Receipt carries beyond the booking itself,
 * saved in one go from the LR Details form.
 *
 * `lrNumber` is included because the auto-issued number is only a default:
 * a transporter's LR book is a physical thing, and staff routinely need the
 * system's number to match a pre-printed pad or to correct a mis-keyed
 * entry. The service decides *when* that is still allowed.
 */
export const updateLrDetailsSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid booking id') }),
  body: z.object({
    lrNumber: z.string().trim().min(3, 'LR number is required').max(40).optional(),

    consignorGstin: optionalGstin,
    consigneeName: optionalText(160),
    consigneeAddress: optionalText(500),
    consigneePhone: z
      .string()
      .trim()
      .regex(MOBILE_RE, 'Enter a valid consignee phone number')
      .optional()
      .or(z.literal('')),
    consigneeGstin: optionalGstin,

    transportMode: z.enum(LR_TRANSPORT_MODES).optional().nullable(),
    paymentTerm: optionalText(60),
    dispatchAt: z.string().trim().regex(DATETIME_RE, 'Enter a valid dispatch date and time').optional().or(z.literal('')),

    freightCharges: optionalAmount('Freight charges'),
    loadingCharges: optionalAmount('Loading charges'),
    unloadingCharges: optionalAmount('Unloading charges'),
    otherCharges: optionalAmount('Other charges'),

    freightPayment: z.enum(LR_FREIGHT_PAYMENTS).optional().nullable(),
    billingParty: z.enum(LR_PARTIES).optional().nullable(),
    freightPayer: z.enum(LR_PARTIES).optional().nullable(),
    advanceReceived: optionalAmount('Advance received'),
    remarks: optionalText(1000),

    // Capped so a scripted caller cannot push an unbounded write through the
    // wholesale replace; no real consignment carries anywhere near this many
    // invoices, and the LR is a single page.
    goodsItems: z.array(goodsItemSchema).max(20, 'An LR can carry at most 20 goods rows').optional(),
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
export type UpdateLrDetailsInput = z.infer<typeof updateLrDetailsSchema>['body'];
