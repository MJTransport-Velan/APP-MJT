import {
  Prisma,
  BookingStatus,
  BookingSource,
  VehicleOwnership,
  LrTransportMode,
  LrFreightPayment,
  LrParty,
} from '@prisma/client';
import { prisma } from '../config/db';

const bookingWithRelations = Prisma.validator<Prisma.BookingInclude>()({
  vehicle: { include: { vehicleType: true } },
  driver: true,
  fromLocation: true,
  toLocation: true,
  statusHistory: { orderBy: { createdAt: 'asc' } },
  goodsItems: { orderBy: { sortOrder: 'asc' } },
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

/**
 * Indian financial year label for a date — "26-27" for anything from 1 April
 * 2026 to 31 March 2027. Local months, not UTC, for the same reason
 * todayStamp() is local: an LR raised at 04:00 IST on 1 April belongs to the
 * new year, and `getUTCMonth()` would still call it March.
 */
export function financialYearLabel(date: Date = new Date()): string {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(startYear % 100).padStart(2, '0')}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * LR numbers run on their own series: MJT/26-27/0158, restarting at 1 each
 * financial year. Unlike the booking and tracking numbers this one is printed
 * on a document a customer files against a GST return, so it follows the
 * transporter's book convention rather than the internal per-day stamp.
 *
 * The FY is derived at issue time rather than passed in — an LR is always
 * numbered in the year it is raised.
 */
async function nextLrNumber(): Promise<string> {
  const fy = financialYearLabel();
  const counter = await prisma.documentCounter.upsert({
    where: { key: `LR-${fy}` },
    update: { seq: { increment: 1 } },
    create: { key: `LR-${fy}`, seq: 1 },
  });
  return `MJT/${fy}/${String(counter.seq).padStart(4, '0')}`;
}

/** One row of the LR's goods table, as supplied by the client. */
export type GoodsItemInput = {
  invoiceNo?: string | null;
  invoiceDate?: Date | null;
  description: string;
  units: number;
  goodsValue: number;
  ewayBillNo?: string | null;
  ewayBillDate?: Date | null;
};

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

  nextLrNumber,

  /**
   * Uniqueness pre-check for an operator-supplied LR number. The column is
   * `@unique` so the database is the real guard; this exists only to turn a
   * clash into a field-level message instead of a raw P2002.
   *
   * Deliberately not filtered by `deletedAt` — the unique index spans
   * soft-deleted rows, so a check that skipped them would pass here and then
   * fail in the write.
   */
  findByLrNumber(lrNumber: string) {
    return prisma.booking.findFirst({ where: { lrNumber }, select: { id: true, bookingNo: true } });
  },

  nextTrackingNumber() {
    return nextNumber('MJX');
  },

  // Booking detail is all optional — a counter booking can be saved with
  // nothing but a name, and filled in as the information arrives. The public
  // intake still supplies every field; it is its validator, not this
  // signature, that holds it to that.
  create(data: {
    bookingNo: string;
    customerName?: string | null;
    mobile?: string | null;
    email?: string | null;
    pickupAddress?: string | null;
    deliveryAddress?: string | null;
    fromPlace?: string | null;
    toPlace?: string | null;
    parcelType?: string | null;
    packages?: number | null;
    weight?: number | null;
    vehicleTypeRequested?: string | null;
    pickupDate?: Date | null;
    expectedDeliveryDate?: Date | null;
    instructions?: string | null;
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
      rejectionReason: string;
      lrGeneratedAt: Date;
      deliveredAt: Date;
      isActive: boolean;
      updatedById: string;

      // ----- Printed LR detail ------------------------------------------
      consignorGstin: string | null;
      consigneeName: string | null;
      consigneeAddress: string | null;
      consigneePhone: string | null;
      consigneeGstin: string | null;
      transportMode: LrTransportMode | null;
      paymentTerm: string | null;
      dispatchAt: Date | null;
      freightCharges: number | null;
      loadingCharges: number | null;
      unloadingCharges: number | null;
      otherCharges: number | null;
      freightPayment: LrFreightPayment | null;
      billingParty: LrParty | null;
      freightPayer: LrParty | null;
      advanceReceived: number | null;
      remarks: string | null;
    }>
  ) {
    return prisma.booking.update({ where: { id }, data });
  },

  /**
   * Swaps the whole goods table for a booking in one transaction. Wholesale
   * replacement rather than a per-row diff: these rows exist only to be
   * printed, so nothing outside the document holds a reference to an
   * individual id worth preserving.
   */
  replaceGoodsItems(bookingId: string, items: GoodsItemInput[]) {
    return prisma.$transaction([
      prisma.bookingGoodsItem.deleteMany({ where: { bookingId } }),
      prisma.bookingGoodsItem.createMany({
        data: items.map((item, index) => ({
          bookingId,
          invoiceNo: item.invoiceNo || null,
          invoiceDate: item.invoiceDate ?? null,
          description: item.description,
          units: item.units,
          goodsValue: item.goodsValue,
          ewayBillNo: item.ewayBillNo || null,
          ewayBillDate: item.ewayBillDate ?? null,
          sortOrder: index,
        })),
      }),
    ]);
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
