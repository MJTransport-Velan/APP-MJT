import { Request } from 'express';
import { BookingStatus } from '@prisma/client';
import { bookingRepository, BookingWithRelations, GoodsItemInput } from '../repositories/booking.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import {
  CreateBookingInput,
  CreateCounterBookingInput,
  AssignVehicleInput,
  UpdateBookingStatusInput,
  ConfirmBookingInput,
  UpdateBookingRouteInput,
  UpdateLrDetailsInput,
} from '../validators/booking.validator';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * The ladder shown to the customer on the public tracking page. LR_GENERATED is
 * deliberately absent — issuing the LR is an internal document step, not
 * something a consignee would recognise as shipment movement, so it maps onto
 * the same rung as VEHICLE_ASSIGNED.
 */
export const TRACKING_STAGES = [
  'Booking Confirmed',
  'Vehicle Assigned',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
] as const;

const STAGE_BY_STATUS: Partial<Record<BookingStatus, number>> = {
  CONFIRMED: 0,
  VEHICLE_ASSIGNED: 1,
  LR_GENERATED: 1,
  PICKED_UP: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
};

/**
 * Where LR details — the number included — may still be edited. The line is
 * drawn at dispatch: once the vehicle has been marked PICKED_UP the driver is
 * carrying a printed copy, and the paper and the record must agree. Before
 * that the document is still a draft in the office, whatever its status.
 */
const LR_EDITABLE_STATUSES: BookingStatus[] = ['CONFIRMED', 'VEHICLE_ASSIGNED', 'LR_GENERATED'];

/** Forward-only ordering for the post-LR delivery stages. */
const DELIVERY_ORDER: BookingStatus[] = [
  'LR_GENERATED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Booking Request Received',
  CONFIRMED: 'Booking Confirmed',
  REJECTED: 'Booking Rejected',
  VEHICLE_ASSIGNED: 'Vehicle Assigned',
  LR_GENERATED: 'LR Generated',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
};

function serialize(booking: BookingWithRelations) {
  return {
    id: booking.id,
    bookingNo: booking.bookingNo,
    status: booking.status,
    statusLabel: STATUS_LABELS[booking.status],
    source: booking.source,
    freightAmount: booking.freightAmount,

    customerName: booking.customerName,
    mobile: booking.mobile,
    email: booking.email,
    pickupAddress: booking.pickupAddress,
    deliveryAddress: booking.deliveryAddress,

    fromPlace: booking.fromPlace,
    toPlace: booking.toPlace,
    parcelType: booking.parcelType,
    packages: booking.packages,
    weight: booking.weight,
    vehicleTypeRequested: booking.vehicleTypeRequested,
    pickupDate: booking.pickupDate,
    expectedDeliveryDate: booking.expectedDeliveryDate,
    instructions: booking.instructions,

    lrNumber: booking.lrNumber,
    trackingNumber: booking.trackingNumber,
    lrGeneratedAt: booking.lrGeneratedAt,
    deliveredAt: booking.deliveredAt,
    rejectionReason: booking.rejectionReason,

    // ----- Printed LR detail ---------------------------------------------
    consignorGstin: booking.consignorGstin,
    consigneeName: booking.consigneeName,
    consigneeAddress: booking.consigneeAddress,
    consigneePhone: booking.consigneePhone,
    consigneeGstin: booking.consigneeGstin,
    transportMode: booking.transportMode,
    paymentTerm: booking.paymentTerm,
    dispatchAt: booking.dispatchAt,
    freightCharges: booking.freightCharges,
    loadingCharges: booking.loadingCharges,
    unloadingCharges: booking.unloadingCharges,
    otherCharges: booking.otherCharges,
    freightPayment: booking.freightPayment,
    billingParty: booking.billingParty,
    freightPayer: booking.freightPayer,
    advanceReceived: booking.advanceReceived,
    remarks: booking.remarks,
    goodsItems: booking.goodsItems.map((item) => ({
      id: item.id,
      invoiceNo: item.invoiceNo,
      invoiceDate: item.invoiceDate,
      description: item.description,
      units: item.units,
      goodsValue: item.goodsValue,
      ewayBillNo: item.ewayBillNo,
      ewayBillDate: item.ewayBillDate,
    })),
    /** Whether the LR is still open to edits. See `LR_EDITABLE_STATUSES`. */
    lrEditable: LR_EDITABLE_STATUSES.includes(booking.status),

    fleetType: booking.fleetType,
    vehicleNumber: booking.vehicleNumber,
    vehicleTypeName: booking.vehicleTypeName,
    driverName: booking.driverName,
    driverMobile: booking.driverMobile,
    vehicle: booking.vehicle
      ? { id: booking.vehicle.id, registrationNumber: booking.vehicle.registrationNumber }
      : null,
    driver: booking.driver ? { id: booking.driver.id, name: booking.driver.name, phone: booking.driver.phone } : null,

    // Route mapped onto the Location master at confirmation.
    fromLocation: booking.fromLocation ? { id: booking.fromLocation.id, name: booking.fromLocation.name } : null,
    toLocation: booking.toLocation ? { id: booking.toLocation.id, name: booking.toLocation.name } : null,

    statusHistory: booking.statusHistory.map((h) => ({
      id: h.id,
      status: h.status,
      statusLabel: STATUS_LABELS[h.status],
      note: h.note,
      createdAt: h.createdAt,
    })),

    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

/** Trims the record down to what a member of the public may see. */
function serializePublic(booking: BookingWithRelations) {
  return {
    bookingNo: booking.bookingNo,
    customerName: booking.customerName,
    fromPlace: booking.fromPlace,
    toPlace: booking.toPlace,
    pickupDate: booking.pickupDate,
    status: booking.status,
    statusLabel: STATUS_LABELS[booking.status],
    lrNumber: booking.lrNumber,
    trackingNumber: booking.trackingNumber,
  };
}

async function loadOrFail(id: string) {
  const booking = await bookingRepository.findById(id);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  return booking;
}

/**
 * `new Date(string)` parses far more leniently than a date picker ever
 * produces — a stray keystroke in a native `<input type="date">`'s year
 * segment can submit a 5-digit year, which JS still turns into a "valid"
 * (if absurd) Date rather than NaN. Prisma then rejects it deep inside a
 * raw driver call, surfacing as an uncaught 500 instead of a clean 400. This
 * requires the exact `YYYY-MM-DD` shape a date input actually emits, with a
 * year in a plausible business range.
 */
function parseDateStrict(value: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(`Enter a valid ${label}`, 400);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1900 || parsed.getUTCFullYear() > 2200) {
    throw new AppError(`Enter a valid ${label}`, 400);
  }
  return parsed;
}

/**
 * The `YYYY-MM-DDTHH:mm` a datetime-local input emits, read as *local* time —
 * an operator typing "08:29 PM" means 20:29 where the vehicle actually left,
 * not 20:29 UTC. `new Date()` already does this for a string with no zone
 * suffix; the shape check exists for the same reason as parseDateStrict's.
 */
function parseDateTimeStrict(value: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    throw new AppError(`Enter a valid ${label}`, 400);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() < 1900 || parsed.getFullYear() > 2200) {
    throw new AppError(`Enter a valid ${label}`, 400);
  }
  return parsed;
}

/**
 * Empty string means "clear this field", not "leave it alone" — the LR form
 * posts every field it owns on every save, so a blank box is an instruction.
 * `undefined` (the field was not sent at all) is what leaves a value be, and
 * the callers below only reach this for fields the form actually submits.
 */
function textOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const bookingService = {
  // ----- Public (no authentication) -------------------------------------

  /**
   * Intake from the MJ Express public website. The booking number is minted
   * here rather than accepted from the caller — the website has no database
   * and must not be trusted to allocate identifiers.
   */
  async createPublic(input: CreateBookingInput) {
    const pickupDate = parseDateStrict(input.pickupDate, 'pickup date');

    let expectedDeliveryDate: Date | undefined;
    if (input.expectedDeliveryDate) {
      const parsed = parseDateStrict(input.expectedDeliveryDate, 'expected delivery date');
      if (parsed < pickupDate) {
        throw new AppError('Expected delivery date cannot be before the pickup date', 400);
      }
      expectedDeliveryDate = parsed;
    }

    const bookingNo = await bookingRepository.nextBookingNo();

    const booking = await bookingRepository.create({
      bookingNo,
      customerName: input.customerName,
      mobile: input.mobile,
      email: input.email || undefined,
      pickupAddress: input.pickupAddress,
      deliveryAddress: input.deliveryAddress,
      fromPlace: input.fromPlace,
      toPlace: input.toPlace,
      parcelType: input.parcelType,
      packages: input.packages,
      weight: input.weight,
      vehicleTypeRequested: input.vehicleType,
      pickupDate,
      expectedDeliveryDate,
      instructions: input.instructions || undefined,
    });

    await bookingRepository.addStatusHistory({
      bookingId: booking.id,
      status: 'PENDING',
      note: 'Booking received from the MJ Express website',
    });

    await auditService.record({
      action: 'CREATE',
      entityType: 'Booking',
      entityId: booking.id,
      description: `Public booking ${booking.bookingNo} received from ${booking.customerName}`,
    });

    const created = await loadOrFail(booking.id);
    return serializePublic(created);
  },

  // ----- Counter entry (authenticated) ----------------------------------

  /**
   * A booking keyed in by staff for a walk-in or phone customer. Differs from
   * the public intake in that the route is chosen from the Location master up
   * front — so no mapping step is needed at confirmation — and an agreed price
   * can be recorded.
   */
  async createCounter(input: CreateCounterBookingInput, req: AuthRequest) {
    const actorId = req.user!.userId;

    const pickupDate = input.pickupDate ? parseDateStrict(input.pickupDate, 'pickup date') : null;

    let expectedDeliveryDate: Date | null = null;
    if (input.expectedDeliveryDate) {
      const parsed = parseDateStrict(input.expectedDeliveryDate, 'expected delivery date');
      // Only comparable when both dates are known; an expected date with no
      // pickup date yet is simply an expected date.
      if (pickupDate && parsed < pickupDate) {
        throw new AppError('Expected delivery date cannot be before the pickup date', 400);
      }
      expectedDeliveryDate = parsed;
    }

    // The route is optional here and required at confirmation. Each side is
    // resolved independently so a booking can carry a known origin while the
    // destination is still being decided.
    const [fromLocation, toLocation] = await Promise.all([
      input.fromLocationId ? bookingRepository.findLocationById(input.fromLocationId) : null,
      input.toLocationId ? bookingRepository.findLocationById(input.toLocationId) : null,
    ]);
    if (input.fromLocationId && !fromLocation) throw new AppError('Pickup location not found', 404);
    if (input.toLocationId && !toLocation) throw new AppError('Delivery location not found', 404);

    const bookingNo = await bookingRepository.nextBookingNo();

    const booking = await bookingRepository.create({
      bookingNo,
      customerName: textOrNull(input.customerName),
      mobile: textOrNull(input.mobile),
      email: textOrNull(input.email),
      pickupAddress: textOrNull(input.pickupAddress),
      deliveryAddress: textOrNull(input.deliveryAddress),
      // Place text mirrors the chosen locations, so the LR and tracking read
      // the same whichever channel the booking came through.
      fromPlace: fromLocation?.name ?? null,
      toPlace: toLocation?.name ?? null,
      parcelType: textOrNull(input.parcelType),
      packages: input.packages ?? null,
      weight: input.weight ?? null,
      vehicleTypeRequested: textOrNull(input.vehicleType),
      pickupDate,
      expectedDeliveryDate,
      instructions: textOrNull(input.instructions),
      source: 'COUNTER',
      fromLocationId: fromLocation?.id,
      toLocationId: toLocation?.id,
      freightAmount: input.freightAmount ?? undefined,
      createdById: actorId,
      updatedById: actorId,
    });

    await bookingRepository.addStatusHistory({
      bookingId: booking.id,
      status: 'PENDING',
      note: 'Booking entered at the counter',
      createdById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Booking',
      entityId: booking.id,
      description: `Counter booking ${booking.bookingNo} created${
        booking.customerName ? ` for ${booking.customerName}` : ''
      }`,
    });

    return bookingService.getById(booking.id);
  },

  async getPublicByBookingNo(bookingNo: string) {
    const booking = await bookingRepository.findByBookingNo(bookingNo.toUpperCase());
    if (!booking) {
      throw new AppError('We could not find a booking with that number', 404);
    }
    return serializePublic(booking);
  },

  /** Shipment status for the public tracking page. */
  async track(trackingNumber: string) {
    const booking = await bookingRepository.findByTrackingNumber(trackingNumber.toUpperCase());
    if (!booking) {
      throw new AppError('We could not find a shipment with that tracking number', 404);
    }

    const stage = STAGE_BY_STATUS[booking.status] ?? 0;

    // Only the rungs the shipment has actually reached carry a real timestamp;
    // the rest are rendered as upcoming.
    const reachedAt = new Map<number, Date>();
    for (const entry of booking.statusHistory) {
      const entryStage = STAGE_BY_STATUS[entry.status];
      if (entryStage === undefined) continue;
      if (!reachedAt.has(entryStage)) {
        reachedAt.set(entryStage, entry.createdAt);
      }
    }

    return {
      trackingNumber: booking.trackingNumber,
      bookingNo: booking.bookingNo,
      lrNumber: booking.lrNumber,
      origin: booking.fromPlace,
      destination: booking.toPlace,
      status: booking.status,
      statusLabel: STATUS_LABELS[booking.status],
      stage,
      expectedDeliveryDate: booking.expectedDeliveryDate,
      deliveredAt: booking.deliveredAt,
      updatedAt: booking.updatedAt,
      timeline: TRACKING_STAGES.map((label, index) => ({
        stage: index,
        label,
        reached: index <= stage,
        reachedAt: reachedAt.get(index) ?? null,
      })),
    };
  },

  // ----- Admin (authenticated) ------------------------------------------

  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const pickupDateRaw = (query.pickupDate as string) || undefined;
    let pickupDate: Date | undefined;
    if (pickupDateRaw) {
      const parsed = new Date(pickupDateRaw);
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        pickupDate = parsed;
      }
    }

    const { rows, total } = await bookingRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      status: (query.status as BookingStatus) || undefined,
      fromPlace: (query.fromPlace as string) || undefined,
      toPlace: (query.toPlace as string) || undefined,
      pickupDate,
    });

    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const booking = await loadOrFail(id);
    const payload = serialize(booking);

    // Pre-select the route dropdowns where the customer's typed place happens
    // to match a Location by name. Only a suggestion — the admin still chooses,
    // so a miss simply means an empty dropdown. Offered for any unmapped
    // booking, not just pending ones, since bookings confirmed before route
    // mapping existed still need it.
    if (!booking.fromLocationId && booking.status !== 'REJECTED') {
      // A booking may have no typed place at all now, in which case there is
      // simply nothing to match against and the dropdowns open empty.
      const [from, to] = await Promise.all([
        booking.fromPlace ? bookingRepository.findLocationByName(booking.fromPlace) : null,
        booking.toPlace ? bookingRepository.findLocationByName(booking.toPlace) : null,
      ]);
      return {
        ...payload,
        suggestedFromLocationId: from?.id ?? null,
        suggestedToLocationId: to?.id ?? null,
      };
    }

    return { ...payload, suggestedFromLocationId: null, suggestedToLocationId: null };
  },

  async stats() {
    const groups = await bookingRepository.countsByStatus();
    const counts: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      REJECTED: 0,
      VEHICLE_ASSIGNED: 0,
      LR_GENERATED: 0,
      PICKED_UP: 0,
      IN_TRANSIT: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
    };
    let total = 0;
    for (const group of groups) {
      counts[group.status] = group._count._all;
      total += group._count._all;
    }
    return { total, ...counts };
  },

  /**
   * Confirming is what mints the LR and tracking numbers. They are issued
   * together here, ahead of the LR document itself, so the customer has a
   * trackable reference as soon as the booking is accepted.
   */
  async confirm(id: string, input: ConfirmBookingInput, req: AuthRequest) {
    const actorId = req.user!.userId;
    const existing = await loadOrFail(id);
    if (existing.status !== 'PENDING') {
      throw new AppError(`Only a pending booking can be confirmed (this one is ${existing.status})`, 409);
    }

    // A website booking's places are free text, so confirmation is where an
    // admin maps them onto the Location master. A counter booking already
    // carries a route, so supplying one is optional — but between the two,
    // there must be one by the end of this call.
    const fromLocationId = input.fromLocationId ?? existing.fromLocationId;
    const toLocationId = input.toLocationId ?? existing.toLocationId;
    if (!fromLocationId || !toLocationId) {
      throw new AppError('Map the pickup and delivery locations before confirming', 400);
    }

    const [fromLocation, toLocation] = await Promise.all([
      bookingRepository.findLocationById(fromLocationId),
      bookingRepository.findLocationById(toLocationId),
    ]);
    if (!fromLocation) throw new AppError('Pickup location not found', 404);
    if (!toLocation) throw new AppError('Delivery location not found', 404);

    const [lrNumber, trackingNumber] = await Promise.all([
      bookingRepository.nextLrNumber(),
      bookingRepository.nextTrackingNumber(),
    ]);

    await bookingRepository.update(id, {
      status: 'CONFIRMED',
      lrNumber,
      trackingNumber,
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      updatedById: actorId,
    });
    await bookingRepository.addStatusHistory({
      bookingId: id,
      status: 'CONFIRMED',
      note: `LR ${lrNumber} and tracking ${trackingNumber} issued`,
      createdById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Booking',
      entityId: id,
      description: `Confirmed booking ${existing.bookingNo}; issued LR ${lrNumber}`,
    });

    return bookingService.getById(id);
  },

  /**
   * Sets or corrects the route after confirmation. Needed for bookings
   * confirmed before route mapping existed, and to fix a mis-mapped location.
   */
  async updateRoute(id: string, input: UpdateBookingRouteInput, req: AuthRequest) {
    const actorId = req.user!.userId;
    const existing = await loadOrFail(id);
    if (existing.status === 'PENDING') {
      throw new AppError('Confirm the booking to set its route', 409);
    }
    if (existing.status === 'REJECTED') {
      throw new AppError('This booking was rejected', 409);
    }

    const [fromLocation, toLocation] = await Promise.all([
      bookingRepository.findLocationById(input.fromLocationId),
      bookingRepository.findLocationById(input.toLocationId),
    ]);
    if (!fromLocation) throw new AppError('Pickup location not found', 404);
    if (!toLocation) throw new AppError('Delivery location not found', 404);

    await bookingRepository.update(id, {
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Booking',
      entityId: id,
      description: `Mapped route for booking ${existing.bookingNo}: ${fromLocation.name} to ${toLocation.name}`,
    });

    return bookingService.getById(id);
  },

  async reject(id: string, rejectionReason: string | undefined, req: AuthRequest) {
    const actorId = req.user!.userId;
    const existing = await loadOrFail(id);
    if (existing.status !== 'PENDING') {
      throw new AppError(`Only a pending booking can be rejected (this one is ${existing.status})`, 409);
    }

    await bookingRepository.update(id, {
      status: 'REJECTED',
      rejectionReason: rejectionReason || undefined,
      updatedById: actorId,
    });
    await bookingRepository.addStatusHistory({
      bookingId: id,
      status: 'REJECTED',
      note: rejectionReason || undefined,
      createdById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Booking',
      entityId: id,
      description: `Rejected booking ${existing.bookingNo}${rejectionReason ? `: ${rejectionReason}` : ''}`,
    });

    return bookingService.getById(id);
  },

  /**
   * Own/Market allocation. An OWN allocation resolves the fleet masters and
   * copies their values onto the booking; a MARKET allocation stores the
   * ad-hoc truck as typed. Either way the resulting vehicle/driver text is a
   * snapshot, so editing a master later never rewrites an LR already issued.
   */
  async assignVehicle(id: string, input: AssignVehicleInput, req: AuthRequest) {
    const actorId = req.user!.userId;
    const existing = await loadOrFail(id);
    if (existing.status !== 'CONFIRMED' && existing.status !== 'VEHICLE_ASSIGNED') {
      throw new AppError(
        `Vehicle details can only be saved on a confirmed booking (this one is ${existing.status})`,
        409
      );
    }

    // The branch is optional too; fall back to whatever the booking already
    // carries so a partial correction cannot silently flip a booking from own
    // fleet to market.
    const fleetType = input.fleetType ?? existing.fleetType ?? 'MARKET';

    if (fleetType === 'OWN') {
      // Either side of the allocation may still be undecided. Look up only
      // what was supplied, and keep what the booking already had for the rest.
      const [vehicle, driver] = await Promise.all([
        input.vehicleId ? bookingRepository.findVehicleById(input.vehicleId) : null,
        input.driverId ? bookingRepository.findDriverById(input.driverId) : null,
      ]);
      if (input.vehicleId && !vehicle) throw new AppError('Vehicle not found', 404);
      if (input.driverId && !driver) throw new AppError('Driver not found', 404);
      if (vehicle && !vehicle.isActive) throw new AppError('That vehicle is inactive', 400);
      if (driver && !driver.isActive) throw new AppError('That driver is inactive', 400);

      await bookingRepository.update(id, {
        status: 'VEHICLE_ASSIGNED',
        fleetType: 'OWN',
        vehicleId: vehicle?.id ?? null,
        driverId: driver?.id ?? null,
        vehicleNumber: vehicle?.registrationNumber ?? null,
        vehicleTypeName: vehicle?.vehicleType?.name ?? existing.vehicleTypeRequested ?? null,
        driverName: driver?.name ?? null,
        // Prefer an explicit override: Driver.phone is optional on the master
        // and an LR without a contact number is of little use in transit.
        driverMobile: textOrNull(input.driverMobile) ?? driver?.phone ?? null,
        updatedById: actorId,
      });
    } else {
      await bookingRepository.update(id, {
        status: 'VEHICLE_ASSIGNED',
        fleetType: 'MARKET',
        vehicleId: null,
        driverId: null,
        vehicleNumber: textOrNull(input.vehicleNumber),
        vehicleTypeName: textOrNull(input.vehicleType),
        driverName: textOrNull(input.driverName),
        driverMobile: textOrNull(input.driverMobile),
        updatedById: actorId,
      });
    }

    // Re-saving details on an already-assigned booking is a correction, not a
    // new transition, so it should not add a second identical timeline entry.
    if (existing.status !== 'VEHICLE_ASSIGNED') {
      await bookingRepository.addStatusHistory({
        bookingId: id,
        status: 'VEHICLE_ASSIGNED',
        note: fleetType === 'OWN' ? 'Own fleet vehicle allocated' : 'Market vehicle allocated',
        createdById: actorId,
      });
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Booking',
      entityId: id,
      description: `Assigned ${fleetType === 'OWN' ? 'own' : 'market'} vehicle to booking ${existing.bookingNo}`,
    });

    return bookingService.getById(id);
  },

  async generateLr(id: string, req: AuthRequest) {
    const actorId = req.user!.userId;
    const existing = await loadOrFail(id);
    // Check the already-generated case first. The lrNumber itself is issued
    // at confirmation, so it is not the signal here — lrGeneratedAt is.
    // Without this branch the generic message below described the wrong
    // problem: it told the user to save vehicle details that were in fact
    // already saved.
    if (existing.lrGeneratedAt) {
      throw new AppError(
        `An LR has already been generated for this booking (${existing.lrNumber})`,
        409
      );
    }
    // No field requirements: an LR is routinely raised before the driver is
    // named or the vehicle number is known, and the document prints "-" for
    // whatever is still open. Only the workflow position is checked — the
    // booking must have been confirmed, which is what mints its numbers.
    if (!LR_EDITABLE_STATUSES.includes(existing.status)) {
      throw new AppError(
        `Confirm the booking before generating its LR (this one is ${STATUS_LABELS[existing.status]})`,
        409
      );
    }

    // Normally minted at confirmation. A booking confirmed before the LR
    // series existed has none, so issue one here rather than refuse.
    const lrNumber = existing.lrNumber ?? (await bookingRepository.nextLrNumber());

    await bookingRepository.update(id, {
      status: 'LR_GENERATED',
      ...(existing.lrNumber ? {} : { lrNumber }),
      lrGeneratedAt: new Date(),
      updatedById: actorId,
    });
    await bookingRepository.addStatusHistory({
      bookingId: id,
      status: 'LR_GENERATED',
      note: `LR ${lrNumber} generated`,
      createdById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Booking',
      entityId: id,
      description: `Generated LR ${lrNumber} for booking ${existing.bookingNo}`,
    });

    return bookingService.getById(id);
  },

  /**
   * Saves everything the printed LR carries beyond the booking itself, in one
   * write: consignee identity, GSTINs, transport and payment terms, the charge
   * breakdown, the goods/e-way-bill rows, and — when the operator overrides it
   * — the LR number.
   *
   * Callable from CONFIRMED onwards so the paperwork can be prepared while the
   * vehicle is still being arranged, and closed off at PICKED_UP, by which
   * point the driver holds a printed copy.
   */
  async updateLrDetails(id: string, input: UpdateLrDetailsInput, req: AuthRequest) {
    const actorId = req.user!.userId;
    const existing = await loadOrFail(id);

    if (existing.status === 'PENDING') {
      throw new AppError('Confirm the booking before entering LR details', 409);
    }
    if (existing.status === 'REJECTED') {
      throw new AppError('This booking was rejected', 409);
    }
    if (!LR_EDITABLE_STATUSES.includes(existing.status)) {
      throw new AppError(
        `The LR can no longer be edited — this booking has already been dispatched (${STATUS_LABELS[existing.status]})`,
        409
      );
    }

    // The LR number is only rewritten when it actually differs, so that a
    // straight re-save of the form does not log a spurious renumbering.
    const requestedLrNumber = input.lrNumber?.trim();
    const renumbering = Boolean(requestedLrNumber && requestedLrNumber !== existing.lrNumber);
    if (renumbering) {
      const clash = await bookingRepository.findByLrNumber(requestedLrNumber!);
      if (clash && clash.id !== id) {
        throw new AppError(`LR number ${requestedLrNumber} is already used by booking ${clash.bookingNo}`, 409);
      }
    }

    await bookingRepository.update(id, {
      ...(renumbering ? { lrNumber: requestedLrNumber! } : {}),

      consignorGstin: textOrNull(input.consignorGstin),
      consigneeName: textOrNull(input.consigneeName),
      consigneeAddress: textOrNull(input.consigneeAddress),
      consigneePhone: textOrNull(input.consigneePhone),
      consigneeGstin: textOrNull(input.consigneeGstin),

      transportMode: input.transportMode ?? null,
      paymentTerm: textOrNull(input.paymentTerm),
      dispatchAt: input.dispatchAt ? parseDateTimeStrict(input.dispatchAt, 'dispatch date and time') : null,

      freightCharges: input.freightCharges ?? null,
      loadingCharges: input.loadingCharges ?? null,
      unloadingCharges: input.unloadingCharges ?? null,
      otherCharges: input.otherCharges ?? null,

      freightPayment: input.freightPayment ?? null,
      billingParty: input.billingParty ?? null,
      freightPayer: input.freightPayer ?? null,
      advanceReceived: input.advanceReceived ?? null,
      remarks: textOrNull(input.remarks),

      updatedById: actorId,
    });

    // Omitting goodsItems entirely leaves the existing rows alone; sending an
    // empty array is how the form clears the table.
    if (input.goodsItems) {
      const items: GoodsItemInput[] = input.goodsItems.map((item) => ({
        invoiceNo: textOrNull(item.invoiceNo),
        invoiceDate: item.invoiceDate ? parseDateStrict(item.invoiceDate, 'invoice date') : null,
        description: item.description.trim(),
        units: item.units,
        goodsValue: item.goodsValue,
        ewayBillNo: textOrNull(item.ewayBillNo),
        ewayBillDate: item.ewayBillDate ? parseDateStrict(item.ewayBillDate, 'e-way bill date') : null,
      }));
      await bookingRepository.replaceGoodsItems(id, items);
    }

    // A renumbering is worth a timeline entry of its own — it is the one edit
    // here that changes an identifier already quoted elsewhere.
    if (renumbering) {
      await bookingRepository.addStatusHistory({
        bookingId: id,
        status: existing.status,
        note: `LR number changed from ${existing.lrNumber ?? 'none'} to ${requestedLrNumber}`,
        createdById: actorId,
      });
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Booking',
      entityId: id,
      description: renumbering
        ? `Updated LR details for booking ${existing.bookingNo}; LR number changed from ${existing.lrNumber ?? 'none'} to ${requestedLrNumber}`
        : `Updated LR details for booking ${existing.bookingNo}`,
    });

    return bookingService.getById(id);
  },

  /** Advances a dispatched shipment along the delivery ladder. Forward-only. */
  async updateStatus(id: string, input: UpdateBookingStatusInput, req: AuthRequest) {
    const actorId = req.user!.userId;
    const existing = await loadOrFail(id);

    const currentIndex = DELIVERY_ORDER.indexOf(existing.status);
    if (currentIndex === -1) {
      throw new AppError('The LR must be generated before delivery progress can be recorded', 409);
    }
    const targetIndex = DELIVERY_ORDER.indexOf(input.status);
    if (targetIndex <= currentIndex) {
      throw new AppError(`This booking is already ${STATUS_LABELS[existing.status]}`, 409);
    }

    await bookingRepository.update(id, {
      status: input.status,
      updatedById: actorId,
      ...(input.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
    });
    await bookingRepository.addStatusHistory({
      bookingId: id,
      status: input.status,
      note: input.note || undefined,
      createdById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Booking',
      entityId: id,
      description: `Booking ${existing.bookingNo} marked ${STATUS_LABELS[input.status]}`,
    });

    return bookingService.getById(id);
  },

  /** The record backing LR preview, print and PDF. Requires the LR to exist. */
  async getLr(id: string) {
    const booking = await loadOrFail(id);
    if (booking.status === 'PENDING' || booking.status === 'REJECTED' || !booking.lrNumber) {
      throw new AppError('This booking has no LR yet', 409);
    }
    if (!booking.lrGeneratedAt) {
      throw new AppError('The LR has not been generated for this booking yet', 409);
    }
    return booking;
  },

  async remove(id: string, req: AuthRequest) {
    const actorId = req.user!.userId;
    const existing = await loadOrFail(id);

    await bookingRepository.softDelete(id, actorId);
    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Booking',
      entityId: id,
      description: `Deleted booking ${existing.bookingNo}`,
    });
  },
};
