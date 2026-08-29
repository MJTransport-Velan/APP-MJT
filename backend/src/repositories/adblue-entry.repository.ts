import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

/**
 * Shared `entryDate` clause for the AdBlue dashboards. `to` arrives as a
 * date-only string, so it is pushed to the end of that day by the caller
 * before it gets here.
 */
function entryDateRange(filters: { from?: Date; to?: Date }) {
  if (!filters.from && !filters.to) return {};
  return {
    entryDate: {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    },
  };
}

const adBlueEntryWithRelations = Prisma.validator<Prisma.AdBlueEntryInclude>()({
  vehicle: { select: { id: true, registrationNumber: true } },
  trip: { select: { id: true, tripNumber: true, vehicleId: true } },
  driver: { select: { id: true, name: true, code: true } },
  supplier: { select: { id: true, name: true } },
  paymentMode: { select: { id: true, name: true } },
});

export type AdBlueEntryWithRelations = Prisma.AdBlueEntryGetPayload<{ include: typeof adBlueEntryWithRelations }>;

export const adBlueEntryRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    vehicleId?: string;
    tripId?: string;
    driverId?: string;
    source?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.AdBlueEntryWhereInput = {
      deletedAt: null,
      AND: [
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.tripId ? { tripId: params.tripId } : {},
        params.driverId ? { driverId: params.driverId } : {},
        params.source ? { source: params.source as never } : {},
        params.from || params.to
          ? {
              entryDate: {
                ...(params.from ? { gte: params.from } : {}),
                ...(params.to ? { lte: params.to } : {}),
              },
            }
          : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.adBlueEntry.findMany({
        where,
        include: adBlueEntryWithRelations,
        orderBy: { entryDate: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.adBlueEntry.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.adBlueEntry.findFirst({ where: { id, deletedAt: null }, include: adBlueEntryWithRelations });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  findTripById(id: string) {
    return prisma.trip.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, vehicleId: true, status: true, tripNumber: true, driverId: true },
    });
  },

  findSupplierById(id: string) {
    return prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  },

  findPaymentModeById(id: string) {
    return prisma.paymentMode.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: Prisma.AdBlueEntryUncheckedCreateInput) {
    return prisma.adBlueEntry.create({ data });
  },

  update(id: string, data: Prisma.AdBlueEntryUncheckedUpdateInput) {
    return prisma.adBlueEntry.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.adBlueEntry.update({ where: { id }, data: { deletedAt: new Date(), updatedById } });
  },

  /**
   * Totals for the AdBlue dashboard. `vehicleId` narrows to one truck;
   * leaving it out covers the whole fleet. The date range, when given,
   * applies to `latest` too — inside a period, "last top-up" means the last
   * one in that period, not today's.
   */
  async consumptionAggregate(filters: { vehicleId?: string; from?: Date; to?: Date }) {
    const where: Prisma.AdBlueEntryWhereInput = {
      deletedAt: null,
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...entryDateRange(filters),
    };
    const [agg, latest, bySource] = await Promise.all([
      prisma.adBlueEntry.aggregate({
        where,
        _sum: { quantityLiters: true, totalAmount: true },
        _avg: { ratePerLiter: true },
        _count: { _all: true },
      }),
      prisma.adBlueEntry.findFirst({ where, orderBy: { entryDate: 'desc' } }),
      prisma.adBlueEntry.groupBy({
        by: ['source'],
        where,
        _sum: { quantityLiters: true, totalAmount: true },
        _count: { _all: true },
      }),
    ]);
    return { agg, latest, bySource };
  },

  /** Truck-wise AdBlue consumption, both sources together. */
  async vehicleConsumptionAggregate(filters: { from?: Date; to?: Date }) {
    const where: Prisma.AdBlueEntryWhereInput = { deletedAt: null, ...entryDateRange(filters) };
    const grouped = await prisma.adBlueEntry.groupBy({
      by: ['vehicleId'],
      where,
      _sum: { quantityLiters: true, totalAmount: true },
      _count: { _all: true },
    });
    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: grouped.map((g) => g.vehicleId) } },
      select: { id: true, registrationNumber: true },
    });
    return { grouped, vehicles };
  },
};
