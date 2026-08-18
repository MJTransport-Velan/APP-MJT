import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const fuelEntryWithRelations = Prisma.validator<Prisma.FuelEntryInclude>()({
  vehicle: true,
  fuelCard: true,
  trip: { select: { id: true, tripNumber: true, vehicleId: true } },
  driver: { select: { id: true, name: true, code: true } },
  supplier: { select: { id: true, name: true } },
  paymentMode: { select: { id: true, name: true } },
  advance: { select: { id: true, advanceNumber: true, amount: true } },
});

export type FuelEntryWithRelations = Prisma.FuelEntryGetPayload<{ include: typeof fuelEntryWithRelations }>;

export const fuelEntryRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    vehicleId?: string;
    tripId?: string;
    driverId?: string;
    fuelType?: string;
    billingMethod?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.FuelEntryWhereInput = {
      deletedAt: null,
      AND: [
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.tripId ? { tripId: params.tripId } : {},
        params.driverId ? { driverId: params.driverId } : {},
        params.fuelType ? { fuelType: params.fuelType as never } : {},
        params.billingMethod ? { billingMethod: params.billingMethod as never } : {},
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
      prisma.fuelEntry.findMany({
        where,
        include: fuelEntryWithRelations,
        orderBy: { entryDate: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.fuelEntry.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.fuelEntry.findFirst({ where: { id, deletedAt: null }, include: fuelEntryWithRelations });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  findTripById(id: string) {
    return prisma.trip.findFirst({ where: { id, deletedAt: null }, select: { id: true, vehicleId: true, status: true, tripNumber: true, driverId: true } });
  },

  findSupplierById(id: string) {
    return prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  },

  findAdvanceById(id: string) {
    return prisma.driverAdvance.findFirst({ where: { id, deletedAt: null } });
  },

  advanceFuelUsageTotal(advanceId: string, excludeEntryId?: string) {
    return prisma.fuelEntry.aggregate({
      where: { advanceId, deletedAt: null, ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}) },
      _sum: { totalAmount: true },
    });
  },

  findPreviousEntry(vehicleId: string, beforeDate: Date, excludeId?: string) {
    return prisma.fuelEntry.findFirst({
      where: { vehicleId, deletedAt: null, entryDate: { lt: beforeDate }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      orderBy: { entryDate: 'desc' },
    });
  },

  create(data: Prisma.FuelEntryUncheckedCreateInput) {
    return prisma.fuelEntry.create({ data });
  },

  update(id: string, data: Prisma.FuelEntryUncheckedUpdateInput) {
    return prisma.fuelEntry.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.fuelEntry.update({ where: { id }, data: { deletedAt: new Date(), updatedById } });
  },

  /** Aggregates for the per-vehicle fuel-tracking dashboard. */
  async vehicleAggregate(vehicleId: string) {
    const [agg, latest] = await Promise.all([
      prisma.fuelEntry.aggregate({
        where: { vehicleId, deletedAt: null },
        _sum: { quantityLiters: true, totalAmount: true, distanceCovered: true },
        _avg: { ratePerLiter: true, mileageKmpl: true },
        _count: { _all: true },
      }),
      prisma.fuelEntry.findFirst({ where: { vehicleId, deletedAt: null }, orderBy: { entryDate: 'desc' } }),
    ]);
    return { agg, latest };
  },
};
