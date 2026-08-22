import { Prisma, ApprovalStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const penaltyWithRelations = Prisma.validator<Prisma.DriverPenaltyInclude>()({
  driver: true,
  trip: { select: { id: true, tripNumber: true } },
});

export type DriverPenaltyWithRelations = Prisma.DriverPenaltyGetPayload<{ include: typeof penaltyWithRelations }>;

export const driverPenaltyRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; driverId?: string; approvalStatus?: ApprovalStatus; isSettled?: boolean }) {
    const where: Prisma.DriverPenaltyWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { penaltyNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.driverId ? { driverId: params.driverId } : {},
        params.approvalStatus ? { approvalStatus: params.approvalStatus } : {},
        params.isSettled !== undefined ? { isSettled: params.isSettled } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.driverPenalty.findMany({ where, include: penaltyWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.driverPenalty.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.driverPenalty.findFirst({ where: { id, deletedAt: null }, include: penaltyWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.driverPenalty.findFirst({ where: { id, deletedAt: null } });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  async nextPenaltyNumber() {
    return nextDocumentNumber('DPN', 4, async (stamp) => {
      const rows = await prisma.driverPenalty.findMany({
        where: { penaltyNumber: { startsWith: `DPN-${stamp}-` } },
        select: { penaltyNumber: true },
      });
      return highestSequenceToday(rows, 'penaltyNumber', 'DPN', stamp);
    });
  },

  create(data: Prisma.DriverPenaltyUncheckedCreateInput) {
    return prisma.driverPenalty.create({ data, include: penaltyWithRelations });
  },

  update(id: string, data: Prisma.DriverPenaltyUncheckedUpdateInput) {
    return prisma.driverPenalty.update({ where: { id }, data, include: penaltyWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.driverPenalty.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
