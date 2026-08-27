import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const structureWithRelations = Prisma.validator<Prisma.DriverSalaryStructureInclude>()({
  driver: true,
});

export type DriverSalaryStructureWithRelations = Prisma.DriverSalaryStructureGetPayload<{
  include: typeof structureWithRelations;
}>;

export const driverSalaryStructureRepository = {
  findManyForDriver(driverId: string) {
    return prisma.driverSalaryStructure.findMany({
      where: { driverId, deletedAt: null },
      include: structureWithRelations,
      orderBy: { effectiveFrom: 'desc' },
    });
  },

  findActiveForDriver(driverId: string) {
    return prisma.driverSalaryStructure.findFirst({
      where: { driverId, isActive: true, deletedAt: null },
      include: structureWithRelations,
    });
  },

  findById(id: string) {
    return prisma.driverSalaryStructure.findFirst({ where: { id, deletedAt: null }, include: structureWithRelations });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  deactivateAllForDriver(driverId: string, updatedById: string) {
    return prisma.driverSalaryStructure.updateMany({ where: { driverId, isActive: true }, data: { isActive: false, updatedById } });
  },

  create(data: Prisma.DriverSalaryStructureUncheckedCreateInput) {
    return prisma.driverSalaryStructure.create({ data, include: structureWithRelations });
  },

  update(id: string, data: Prisma.DriverSalaryStructureUncheckedUpdateInput) {
    return prisma.driverSalaryStructure.update({ where: { id }, data, include: structureWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.driverSalaryStructure.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  // Same "COMPLETED + actualEndDate" convention used across every other
  // trip-in-period report/query in this codebase (management/operations/
  // profitability reports) — a trip counts toward the month it finished in.
  async sumFreightForDriverInPeriod(driverId: string, periodStart: Date, periodEnd: Date) {
    const result = await prisma.trip.aggregate({
      where: { driverId, status: 'COMPLETED', deletedAt: null, actualEndDate: { gte: periodStart, lte: periodEnd } },
      _sum: { freightAmount: true },
    });
    return Number(result._sum.freightAmount || 0);
  },
};
