import { Prisma, TripStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { dateRangeWhere } from '../utils/reportFilters';

const tripWithRelations = Prisma.validator<Prisma.TripInclude>()({
  intent: { include: { company: true, material: true, vehicleType: true } },
  vehicle: true,
  driver: true,
  supplier: true,
  fromLocation: true,
  toLocation: true,
  createdBy: true,
  assignedBy: true,
  invoice: { select: { id: true, invoiceNumber: true } },
});

export type TripWithRelations = Prisma.TripGetPayload<{ include: typeof tripWithRelations }>;

// Trip statuses at which a vehicle/driver is no longer considered occupied by
// that trip: COMPLETED/CANCELLED (trip is over), DRAFT (never actually
// assigned), and UNLOADING (cargo is down — the vehicle/driver can be
// redeployed to a new trip even before this one's paperwork/settlement is
// finalized).
const RELEASED_TRIP_STATUSES: TripStatus[] = ['COMPLETED', 'CANCELLED', 'DRAFT', 'UNLOADING'];

// A trip matches a team's ownership filter if it was explicitly routed there
// at intent approval (fleetType), or — for trips created before that field
// existed (fleetType is null) — falls back to the old behavior: visible to
// both teams while unassigned, then scoped by whichever vehicle actually got
// assigned.
function ownershipWhere(ownership: 'OWN' | 'MARKET'): Prisma.TripWhereInput {
  return {
    OR: [
      { fleetType: ownership },
      {
        AND: [
          { fleetType: null },
          { OR: [{ vehicleId: null }, { vehicle: { ownership } }] },
        ],
      },
    ],
  };
}

export const tripRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    intentId?: string;
    vehicleId?: string;
    driverId?: string;
    supplierId?: string;
    status?: TripStatus;
    statusIn?: TripStatus[];
    vehicleOwnership?: 'OWN' | 'MARKET';
    forcedAssignedUserId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    companyIds?: string[];
  }) {
    const where: Prisma.TripWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { tripNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.intentId ? { intentId: params.intentId } : {},
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.driverId ? { driverId: params.driverId } : {},
        params.supplierId ? { supplierId: params.supplierId } : {},
        params.status ? { status: params.status } : {},
        params.statusIn && params.statusIn.length > 0 ? { status: { in: params.statusIn } } : {},
        // Team routing — see ownershipWhere() above.
        params.vehicleOwnership ? ownershipWhere(params.vehicleOwnership) : {},
        // OWN_FLEET_OPERATOR/MARKET_FLEET_OPERATOR: within their team's queue,
        // unassigned (APPROVED) trips stay visible to the whole team, but once
        // a trip is assigned it should only keep showing for whoever actually
        // assigned it — combined with (not a replacement for) the ownership
        // filter above (see trip.service.ts list()).
        params.forcedAssignedUserId
          ? { OR: [{ status: 'APPROVED' }, { assignedById: params.forcedAssignedUserId }] }
          : {},
        params.companyIds ? { intent: { companyId: { in: params.companyIds } } } : {},
        dateRangeWhere('scheduledStartDate', { dateFrom: params.dateFrom, dateTo: params.dateTo }),
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.trip.findMany({
        where,
        include: tripWithRelations,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.trip.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.trip.findFirst({ where: { id, deletedAt: null }, include: tripWithRelations });
  },

  findIntentById(id: string) {
    return prisma.intent.findFirst({ where: { id, deletedAt: null } });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  findSupplierById(id: string) {
    return prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  },

  /** Trips still attached to this intent (i.e. not cancelled/soft-deleted) — used to guard against creating a second trip for the same intent, and to find the auto-created placeholder to clean up if the intent is cancelled. */
  findOpenTripsByIntent(intentId: string) {
    return prisma.trip.findMany({ where: { intentId, deletedAt: null, status: { not: 'CANCELLED' } } });
  },

  /** Any non-terminal trip currently holding this vehicle. */
  findActiveTripByVehicle(vehicleId: string, excludeTripId?: string) {
    return prisma.trip.findFirst({
      where: {
        vehicleId,
        deletedAt: null,
        status: { notIn: RELEASED_TRIP_STATUSES },
        ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
      },
    });
  },

  /**
   * The trip that overlapped this vehicle's calendar day at all — any trip
   * whose window intersects [00:00:00.000, 23:59:59.999] on that UTC date.
   * Fuel Entry / manual FASTag usage only collect a date (no time-of-day),
   * so a point-in-time check would miss a trip that started later the same
   * day (e.g. entryDate parses to UTC midnight, trip started at 5:46pm).
   * Picks the most recently started trip if more than one overlapped.
   */
  findActiveTripForVehicleOnDate(vehicleId: string, date: Date) {
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
    return prisma.trip.findFirst({
      where: {
        vehicleId,
        deletedAt: null,
        actualStartDate: { not: null, lte: dayEnd },
        OR: [{ actualEndDate: null }, { actualEndDate: { gte: dayStart } }],
      },
      orderBy: { actualStartDate: 'desc' },
      select: {
        id: true,
        tripNumber: true,
        vehicleId: true,
        status: true,
        driverId: true,
        driver: { select: { id: true, name: true, code: true } },
      },
    });
  },

  /**
   * The vehicle's current (still-occupying, non-terminal) trip if one
   * exists, else its most recently started trip ever, else null. Used
   * where a trip must always be attached to something (e.g. FASTag toll
   * usage) rather than only matching a specific date.
   */
  async findCurrentOrLastTripForVehicle(vehicleId: string) {
    const driverSelect = { driver: { select: { id: true, name: true, code: true } } };
    const current = await prisma.trip.findFirst({
      where: { vehicleId, deletedAt: null, status: { notIn: RELEASED_TRIP_STATUSES } },
      include: driverSelect,
    });
    if (current) return current;
    return prisma.trip.findFirst({
      where: { vehicleId, deletedAt: null, actualStartDate: { not: null } },
      orderBy: { actualStartDate: 'desc' },
      include: driverSelect,
    });
  },

  /** Any non-terminal trip currently holding this driver. */
  findActiveTripByDriver(driverId: string, excludeTripId?: string) {
    return prisma.trip.findFirst({
      where: {
        driverId,
        deletedAt: null,
        status: { notIn: RELEASED_TRIP_STATUSES },
        ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
      },
    });
  },

  /** Vehicles not currently holding another occupied trip (see RELEASED_TRIP_STATUSES),
   * excluding this trip's own placeholder so a trip's already-assigned vehicle still
   * shows up when reopening its assignment dialog. */
  async findAvailableVehicles(excludeTripId?: string, ownership?: 'OWN' | 'MARKET', vehicleTypeId?: string) {
    const busy = await prisma.trip.findMany({
      where: {
        vehicleId: { not: null },
        deletedAt: null,
        status: { notIn: RELEASED_TRIP_STATUSES },
        ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
      },
      select: { vehicleId: true },
    });
    const busyVehicleIds = busy.map((b) => b.vehicleId).filter((id): id is string => !!id);

    return prisma.vehicle.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        status: { notIn: ['UNDER_MAINTENANCE', 'INACTIVE'] },
        id: { notIn: busyVehicleIds },
        ...(ownership ? { ownership } : {}),
        ...(vehicleTypeId ? { vehicleTypeId } : {}),
      },
      orderBy: { registrationNumber: 'asc' },
    });
  },

  /** Drivers not currently holding another occupied trip (see RELEASED_TRIP_STATUSES). */
  async findAvailableDrivers(excludeTripId?: string) {
    const busy = await prisma.trip.findMany({
      where: {
        driverId: { not: null },
        deletedAt: null,
        status: { notIn: RELEASED_TRIP_STATUSES },
        ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
      },
      select: { driverId: true },
    });
    const busyDriverIds = busy.map((b) => b.driverId).filter((id): id is string => !!id);

    return prisma.driver.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        id: { notIn: busyDriverIds },
      },
      orderBy: { name: 'asc' },
    });
  },

  async nextTripNumber() {
    const count = await prisma.trip.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TRP-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  create(data: {
    tripNumber: string;
    intentId: string;
    fromLocationId: string;
    toLocationId: string;
    freightAmount?: number;
    loadWeight?: number;
    loadDescription?: string;
    scheduledStartDate?: Date;
    expectedDeliveryDate?: Date;
    podRequired?: boolean;
    status?: TripStatus;
    fleetType?: 'OWN' | 'MARKET' | null;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.trip.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      freightAmount: number;
      loadingCharges: number;
      unloadingCharges: number;
      loadWeight: number;
      loadDescription: string;
      scheduledStartDate: Date;
      expectedDeliveryDate: Date;
      podRequired: boolean;
      vehicleId: string | null;
      driverId: string | null;
      supplierId: string;
      supplierRate: number;
      marketVehicleNumber: string;
      marketDriverName: string;
      marketDriverContact: string;
      status: TripStatus;
      actualStartDate: Date;
      actualEndDate: Date;
      podStatus: 'PENDING' | 'UPLOADED' | 'VERIFIED';
      cancelReason: string;
      isActive: boolean;
      updatedById: string;
      assignedById: string | null;
    }>
  ) {
    return prisma.trip.update({ where: { id }, data });
  },

  addStatusHistory(tripId: string, status: TripStatus, notes: string | undefined, createdById: string) {
    return prisma.tripStatusHistory.create({ data: { tripId, status, notes, createdById } });
  },

  getStatusHistory(tripId: string) {
    return prisma.tripStatusHistory.findMany({ where: { tripId }, orderBy: { changedAt: 'asc' } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.trip.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  countPodDocuments(tripId: string) {
    return prisma.attachment.count({ where: { entityType: 'TRIP', entityId: tripId, category: 'POD', deletedAt: null } });
  },

  setVehicleStatus(vehicleId: string, status: 'RUNNING' | 'AVAILABLE', updatedById: string) {
    return prisma.vehicle.update({ where: { id: vehicleId }, data: { status, updatedById } }).catch(() => null);
  },

  countsByStatus(vehicleOwnership?: 'OWN' | 'MARKET', companyIds?: string[], forcedAssignedUserId?: string) {
    return prisma.trip.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        AND: [
          vehicleOwnership ? ownershipWhere(vehicleOwnership) : {},
          forcedAssignedUserId
            ? { OR: [{ status: 'APPROVED' }, { assignedById: forcedAssignedUserId }] }
            : {},
          companyIds ? { intent: { companyId: { in: companyIds } } } : {},
        ],
      },
      _count: { _all: true },
    });
  },
};
