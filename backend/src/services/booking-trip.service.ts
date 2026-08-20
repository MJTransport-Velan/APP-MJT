import { BookingStatus, TripStatus } from '@prisma/client';
import { bookingRepository, BookingWithRelations } from '../repositories/booking.repository';
import { intentRepository } from '../repositories/intent.repository';
import { tripRepository } from '../repositories/trip.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Bridges Booking & LR into Operations.
 *
 * A website booking is a real haulage job, so once a vehicle is allocated it
 * should appear in the Trip list like any other. Trip.intentId is mandatory, so
 * each booking also gets an Intent — raised against the MJ Express company and
 * marked CONVERTED immediately, since it is a record of work already agreed
 * rather than a request awaiting approval. It therefore never enters the
 * intent team's approval queue.
 */

/** Booking delivery stage -> the equivalent point in the trip lifecycle. */
const TRIP_STATUS_BY_BOOKING_STATUS: Partial<Record<BookingStatus, TripStatus>> = {
  PICKED_UP: 'STARTED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'REACHED_DESTINATION',
  DELIVERED: 'COMPLETED',
};

export const bookingTripService = {
  /**
   * Creates the Intent + Trip for a booking whose vehicle has just been
   * allocated, and links them back onto the booking. Idempotent: a booking that
   * already has a trip has its existing trip updated instead, so re-saving
   * vehicle details never produces a duplicate.
   */
  async syncOnVehicleAssigned(booking: BookingWithRelations, actorId: string) {
    if (!booking.fromLocationId || !booking.toLocationId) {
      // Bookings confirmed before the route became part of confirmation have no
      // mapped locations. Blocking allocation over that would strand them with
      // no way forward, so allocation (and the LR) proceeds and the trip is
      // raised later, once an admin maps the route on the detail screen.
      logger.warn(
        `Booking ${booking.bookingNo} has no mapped route; skipping trip creation until one is set.`
      );
      return null;
    }

    const vehicleFields = {
      vehicleId: booking.fleetType === 'OWN' ? booking.vehicleId : null,
      driverId: booking.fleetType === 'OWN' ? booking.driverId : null,
      marketVehicleNumber: booking.fleetType === 'MARKET' ? booking.vehicleNumber ?? undefined : undefined,
      marketDriverName: booking.fleetType === 'MARKET' ? booking.driverName ?? undefined : undefined,
      marketDriverContact: booking.fleetType === 'MARKET' ? booking.driverMobile ?? undefined : undefined,
      updatedById: actorId,
      assignedById: actorId,
    };

    // Re-allocation: keep the existing trip, just move the vehicle across.
    if (booking.tripId) {
      await tripRepository.update(booking.tripId, vehicleFields);
      return booking.tripId;
    }

    const company = await bookingRepository.findCompanyByCode(env.mjExpressCompanyCode);
    if (!company) {
      throw new AppError(
        `The customer company "${env.mjExpressCompanyCode}" does not exist. ` +
          'Create it under Administration > Companies, or set MJEXPRESS_COMPANY_CODE.',
        409
      );
    }

    const intentNumber = await intentRepository.nextIntentNumber();
    const intent = await intentRepository.create({
      intentNumber,
      companyId: company.id,
      fromLocationId: booking.fromLocationId,
      toLocationId: booking.toLocationId,
      packages: booking.packages,
      quantityTon: Number(booking.weight) / 1000,
      expectedPickupDate: booking.pickupDate,
      expectedDeliveryDate: booking.expectedDeliveryDate ?? undefined,
      // Counter bookings carry an agreed price; website bookings are unpriced,
      // so those trips stay valueless until Operations sets a rate.
      freightAmount: booking.freightAmount ? Number(booking.freightAmount) : undefined,
      remarks:
        booking.source === 'COUNTER'
          ? `MJ Express counter booking ${booking.bookingNo} (${booking.customerName})`
          : `MJ Express website booking ${booking.bookingNo} (${booking.customerName})`,
      createdById: actorId,
      updatedById: actorId,
    });

    // CONVERTED, not APPROVED: the trip exists already, so this intent must not
    // surface as work awaiting the intent team.
    await intentRepository.update(intent.id, {
      status: 'CONVERTED',
      fleetType: booking.fleetType ?? undefined,
      updatedById: actorId,
    });

    const tripNumber = await tripRepository.nextTripNumber();
    const trip = await tripRepository.create({
      tripNumber,
      intentId: intent.id,
      fromLocationId: booking.fromLocationId,
      toLocationId: booking.toLocationId,
      loadWeight: Number(booking.weight) / 1000,
      loadDescription: `${booking.parcelType} - ${booking.packages} package(s)`,
      freightAmount: booking.freightAmount ? Number(booking.freightAmount) : undefined,
      scheduledStartDate: booking.pickupDate,
      expectedDeliveryDate: booking.expectedDeliveryDate ?? undefined,
      // The vehicle is already allocated, so the trip starts where a manually
      // planned trip would only arrive after assignment.
      status: 'ASSIGNED',
      fleetType: booking.fleetType,
      createdById: actorId,
      updatedById: actorId,
    });

    await tripRepository.update(trip.id, vehicleFields);
    await tripRepository.addStatusHistory(
      trip.id,
      'ASSIGNED',
      `Created from MJ Express booking ${booking.bookingNo}`,
      actorId
    );

    await bookingRepository.update(booking.id, { intentId: intent.id, tripId: trip.id, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Trip',
      entityId: trip.id,
      description: `Created trip ${tripNumber} from MJ Express booking ${booking.bookingNo}`,
    });

    return trip.id;
  },

  /**
   * Mirrors the booking's delivery progress onto its trip. One-way: the booking
   * is the source of truth for a website job. Failures are logged rather than
   * thrown — a trip that falls out of step must not block the booking update
   * the operator actually asked for.
   */
  async syncStatus(booking: BookingWithRelations, status: BookingStatus, actorId: string) {
    if (!booking.tripId) return;
    const tripStatus = TRIP_STATUS_BY_BOOKING_STATUS[status];
    if (!tripStatus) return;

    try {
      await tripRepository.update(booking.tripId, {
        status: tripStatus,
        updatedById: actorId,
        ...(tripStatus === 'STARTED' ? { actualStartDate: new Date() } : {}),
        ...(tripStatus === 'COMPLETED' ? { actualEndDate: new Date() } : {}),
      });
      await tripRepository.addStatusHistory(
        booking.tripId,
        tripStatus,
        `MJ Express booking ${booking.bookingNo} marked ${status.replace(/_/g, ' ').toLowerCase()}`,
        actorId
      );
    } catch (err) {
      logger.error(`Failed to sync trip ${booking.tripId} for booking ${booking.bookingNo}`, err);
    }
  },
};
