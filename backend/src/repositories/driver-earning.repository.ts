import { Prisma, ApprovalStatus, DriverEarningCategory } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const earningWithRelations = Prisma.validator<Prisma.DriverEarningInclude>()({
  driver: true,
  trip: { select: { id: true, tripNumber: true } },
  rule: true,
});

export type DriverEarningWithRelations = Prisma.DriverEarningGetPayload<{ include: typeof earningWithRelations }>;

export const driverEarningRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; driverId?: string; earningCategory?: DriverEarningCategory; approvalStatus?: ApprovalStatus; isSettled?: boolean }) {
    const where: Prisma.DriverEarningWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { earningNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.driverId ? { driverId: params.driverId } : {},
        params.earningCategory ? { earningCategory: params.earningCategory } : {},
        params.approvalStatus ? { approvalStatus: params.approvalStatus } : {},
        params.isSettled !== undefined ? { isSettled: params.isSettled } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.driverEarning.findMany({ where, include: earningWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.driverEarning.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.driverEarning.findFirst({ where: { id, deletedAt: null }, include: earningWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.driverEarning.findFirst({ where: { id, deletedAt: null } });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  findRuleById(id: string) {
    return prisma.driverEarningRule.findFirst({ where: { id, deletedAt: null } });
  },

  findActiveRule(earningType: string) {
    return prisma.driverEarningRule.findFirst({ where: { earningType: earningType as never, isActive: true, deletedAt: null } });
  },

  async nextEarningNumber() {
    return nextDocumentNumber('DEN', 4, async (stamp) => {
      const rows = await prisma.driverEarning.findMany({
        where: { earningNumber: { startsWith: `DEN-${stamp}-` } },
        select: { earningNumber: true },
      });
      return highestSequenceToday(rows, 'earningNumber', 'DEN', stamp);
    });
  },

  create(data: Prisma.DriverEarningUncheckedCreateInput) {
    return prisma.driverEarning.create({ data, include: earningWithRelations });
  },

  update(id: string, data: Prisma.DriverEarningUncheckedUpdateInput) {
    return prisma.driverEarning.update({ where: { id }, data, include: earningWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.driverEarning.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  // --- DriverEarningRule (thin rate card) ---
  listRules() {
    return prisma.driverEarningRule.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
  },

  createRule(data: Prisma.DriverEarningRuleUncheckedCreateInput) {
    return prisma.driverEarningRule.create({ data });
  },

  updateRule(id: string, data: Prisma.DriverEarningRuleUncheckedUpdateInput) {
    return prisma.driverEarningRule.update({ where: { id }, data });
  },

  softDeleteRule(id: string, updatedById: string) {
    return prisma.driverEarningRule.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
