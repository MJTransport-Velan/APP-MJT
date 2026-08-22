import { Prisma, ApprovalStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const advanceWithRelations = Prisma.validator<Prisma.DriverAdvanceInclude>()({
  driver: true,
  trip: { select: { id: true, tripNumber: true } },
  vehicle: { select: { id: true, registrationNumber: true } },
  paymentMode: { select: { id: true, name: true } },
});

export type DriverAdvanceWithRelations = Prisma.DriverAdvanceGetPayload<{ include: typeof advanceWithRelations }>;

export const driverAdvanceRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; driverId?: string; approvalStatus?: ApprovalStatus; isSettled?: boolean }) {
    const where: Prisma.DriverAdvanceWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { advanceNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.driverId ? { driverId: params.driverId } : {},
        params.approvalStatus ? { approvalStatus: params.approvalStatus } : {},
        params.isSettled !== undefined ? { isSettled: params.isSettled } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.driverAdvance.findMany({ where, include: advanceWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.driverAdvance.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.driverAdvance.findFirst({ where: { id, deletedAt: null }, include: advanceWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.driverAdvance.findFirst({ where: { id, deletedAt: null } });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  async nextAdvanceNumber() {
    return nextDocumentNumber('DAV', 4, async (stamp) => {
      const rows = await prisma.driverAdvance.findMany({
        where: { advanceNumber: { startsWith: `DAV-${stamp}-` } },
        select: { advanceNumber: true },
      });
      return highestSequenceToday(rows, 'advanceNumber', 'DAV', stamp);
    });
  },

  create(data: Prisma.DriverAdvanceUncheckedCreateInput) {
    return prisma.driverAdvance.create({ data, include: advanceWithRelations });
  },

  update(id: string, data: Prisma.DriverAdvanceUncheckedUpdateInput) {
    return prisma.driverAdvance.update({ where: { id }, data, include: advanceWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.driverAdvance.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  findUnsettledForDriver(driverId: string, periodStart: Date, periodEnd: Date) {
    return prisma.driverAdvance.findMany({
      where: { driverId, isSettled: false, approvalStatus: 'APPROVED', deletedAt: null, createdAt: { gte: periodStart, lte: periodEnd } },
    });
  },
};
