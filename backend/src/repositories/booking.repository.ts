import { Prisma, BookingStatus, BookingSource, VehicleOwnership } from '@prisma/client';
import { prisma } from '../config/db';

const bookingWithRelations = Prisma.validator<Prisma.BookingInclude>()({
  vehicle: { include: { vehicleType: true } },
  driver: true,
  fromLocation: true,
  toLocation: true,
  trip: { select: { id: true, tripNumber: true, status: true } },
  intent: { select: { id: true, intentNumber: true } },
  statusHistory: { orderBy: { createdAt: 'asc' } },
});

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingWithRelations }>;

/**
 * Local (not UTC) calendar date, because the number a customer reads off their
 * receipt has to match the day they actually booked in the operating timezone.
 * `toISOString().slice(0,10)` — the idiom the internal modules use — would roll
 * the stamp back a day for anything booked before 05:30 IST.
 */
function todayStamp(): string {
  const now = new Date();
  return (
    `${now.getFullYear()}` +
    `${String(now.getMonth() + 1).padStart(2, '0')}` +
    `${String(now.getDate()).padStart(2, '0')}`
  );
}

/**
 * Issues the next number in a per-prefix, per-day sequence as a single atomic
 * upsert (INSERT ... ON CONFLICT DO UPDATE seq = seq + 1). See the
 * DocumentCounter model comment for why this doesn't use the count()+1 idiom.
 */
async function nextNumber(prefix: string): Promise<string> {
  const stamp = todayStamp();
  const counter = await prisma.documentCounter.upsert({
    where: { key: `${prefix}-${stamp}` },
    update: { seq: { increment: 1 } },
    create: { key: `${prefix}-${stamp}`, seq: 1 },
  });
  return `${prefix}${stamp}${String(counter.seq).padStart(4, '0')}`;
}

export const bookingRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    status?: BookingStatus;
    fromPlace?: string;
    toPlace?: string;
    pickupDate?: Date;
  }) {
    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { bookingNo: { contains: params.search, mode: 'insensitive' } },
                { customerName: { contains: params.search, mode: 'insensitive' } },
                { mobile: { contains: params.search, mode: 'insensitive' } },
                { lrNumber: { contains: params.search, mode: 'insensitive' } },
                { trackingNumber: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.status ? { status: params.status } : {},
        params.fromPlace ? { fromPlace: { contains: params.fromPlace, mode: 'insensitive' } } : {},
        params.toPlace ? { toPlace: { contains: params.toPlace, mode: 'insensitive' } } : {},
        params.pickupDate
          ? {
              pickupDate: {
                gte: params.pickupDate,
                lt: new Date(params.pickupDate.getTime() + 24 * 60 * 60 * 1000),
              },
            }
          : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: bookingWithRelations,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.booking.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.booking.findFirst({ where: { id, deletedAt: null }, include: bookingWithRelations });
  },

  findByBookingNo(bookingNo: string) {
    return prisma.booking.findFirst({ where: { bookingNo, deletedAt: null }, include: bookingWithRelations });
  },

  findByTrackingNumber(trackingNumber: string) {
    return prisma.booking.findFirst({ where: { trackingNumber, deletedAt: null }, include: bookingWithRelations });
  },

  /** Own-fleet allocation resolves against the live masters; inactive/deleted rows are not selectable. */
  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null }, include: { vehicleType: true } });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  nextBookingNo() {
    return nextNumber('BK');
  },

  nextLrNumber() {
    return nextNumber('LR');
  },

  nextTrackingNumber() {
    return nextNumber('MJX');
  },

  create(data: {
    bookingNo: string;
    customerName: string;
    mobile: string;
    email?: string;
    pickupAddress: string;
    deliveryAddress: string;
    fromPlace: string;
    toPlace: string;
    parcelType: string;
    packages: number;
    weight: number;
    vehicleTypeRequested: string;
    pickupDate: Date;
    expectedDeliveryDate?: Date;
    instructions?: string;
    // Counter entry only — the public site supplies none of these.
    source?: BookingSource;
    fromLocationId?: string;
    toLocationId?: string;
    freightAmount?: number;
    createdById?: string;
    updatedById?: string;
  }) {
    return prisma.booking.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      status: BookingStatus;
      lrNumber: string;
      trackingNumber: string;
      fleetType: VehicleOwnership;
      vehicleId: string | null;
      driverId: string | null;
      vehicleNumber: string | null;
      vehicleTypeName: string | null;
      driverName: string | null;
      driverMobile: string | null;
      fromLocationId: string;
      toLocationId: string;
      intentId: string;
      tripId: string;
      rejectionReason: string;
      lrGeneratedAt: Date;
      deliveredAt: Date;
      isActive: boolean;
      updatedById: string;
    }>
  ) {
    return prisma.booking.update({ where: { id }, data });
  },

  findLocationById(id: string) {
    return prisma.location.findFirst({ where: { id, deletedAt: null } });
  },

  /**
   * Best-effort match of the customer's typed place against the Location
   * master, used only to pre-select the dropdowns on the confirm screen — the
   * admin still approves the choice, so a wrong guess costs nothing.
   */
  findLocationByName(name: string) {
    return prisma.location.findFirst({
      where: { deletedAt: null, isActive: true, name: { equals: name.trim(), mode: 'insensitive' } },
    });
  },

  /** The Company that all website bookings are billed to. */
  findCompanyByCode(code: string) {
    return prisma.company.findFirst({ where: { code, deletedAt: null } });
  },

  addStatusHistory(data: { bookingId: string; status: BookingStatus; note?: string; createdById?: string }) {
    return prisma.bookingStatusHistory.create({ data });
  },

  countsByStatus() {
    return prisma.booking.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.booking.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedById },
    });
  },
};
