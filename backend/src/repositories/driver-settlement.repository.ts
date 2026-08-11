import { Prisma, DriverSettlementStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { partyLoanRepository } from './party-loan.repository';

const settlementWithRelations = Prisma.validator<Prisma.DriverSettlementInclude>()({
  driver: true,
  lines: { orderBy: { createdAt: 'asc' } },
});

export type DriverSettlementWithRelations = Prisma.DriverSettlementGetPayload<{ include: typeof settlementWithRelations }>;

export const driverSettlementRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; driverId?: string; status?: DriverSettlementStatus }) {
    const where: Prisma.DriverSettlementWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { settlementNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.driverId ? { driverId: params.driverId } : {},
        params.status ? { status: params.status } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.driverSettlement.findMany({ where, include: settlementWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.driverSettlement.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.driverSettlement.findFirst({ where: { id, deletedAt: null }, include: settlementWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.driverSettlement.findFirst({ where: { id, deletedAt: null } });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  async nextSettlementNumber() {
    const count = await prisma.driverSettlement.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `DST-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  create(data: Prisma.DriverSettlementUncheckedCreateInput) {
    return prisma.driverSettlement.create({ data, include: settlementWithRelations });
  },

  update(id: string, data: Prisma.DriverSettlementUncheckedUpdateInput) {
    return prisma.driverSettlement.update({ where: { id }, data, include: settlementWithRelations });
  },

  deleteLines(settlementId: string) {
    return prisma.driverSettlementLine.deleteMany({ where: { settlementId } });
  },

  createLines(data: Prisma.DriverSettlementLineUncheckedCreateInput[]) {
    if (data.length === 0) return Promise.resolve();
    return prisma.driverSettlementLine.createMany({ data });
  },

  findUnsettledAdvances(driverId: string, periodStart: Date, periodEnd: Date) {
    return prisma.driverAdvance.findMany({ where: { driverId, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null, createdAt: { gte: periodStart, lte: periodEnd } } });
  },

  findUnsettledEarnings(driverId: string, periodStart: Date, periodEnd: Date) {
    return prisma.driverEarning.findMany({ where: { driverId, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null, createdAt: { gte: periodStart, lte: periodEnd } } });
  },

  findUnsettledReimbursements(driverId: string, periodStart: Date, periodEnd: Date) {
    return prisma.driverExpenseReimbursement.findMany({ where: { driverId, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null, createdAt: { gte: periodStart, lte: periodEnd } } });
  },

  findUnsettledPenalties(driverId: string, periodStart: Date, periodEnd: Date) {
    return prisma.driverPenalty.findMany({ where: { driverId, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null, createdAt: { gte: periodStart, lte: periodEnd } } });
  },

  findDueLoanInstallments(driverId: string, periodEnd: Date) {
    return partyLoanRepository.findDueInstallmentsForBorrower('DRIVER', driverId, periodEnd);
  },

  markAdvancesSettled(ids: string[], settlementId: string) {
    if (ids.length === 0) return Promise.resolve();
    return prisma.driverAdvance.updateMany({ where: { id: { in: ids } }, data: { isSettled: true, settlementId } });
  },

  markEarningsSettled(ids: string[], settlementId: string) {
    if (ids.length === 0) return Promise.resolve();
    return prisma.driverEarning.updateMany({ where: { id: { in: ids } }, data: { isSettled: true, settlementId } });
  },

  markReimbursementsSettled(ids: string[], settlementId: string) {
    if (ids.length === 0) return Promise.resolve();
    return prisma.driverExpenseReimbursement.updateMany({ where: { id: { in: ids } }, data: { isSettled: true, settlementId } });
  },

  markPenaltiesSettled(ids: string[], settlementId: string) {
    if (ids.length === 0) return Promise.resolve();
    return prisma.driverPenalty.updateMany({ where: { id: { in: ids } }, data: { isSettled: true, settlementId } });
  },

  markInstallmentsRecovered(ids: string[], settlementId: string) {
    if (ids.length === 0) return Promise.resolve();
    return partyLoanRepository.markInstallmentsRecoveredBulk(ids, 'DRIVER_SETTLEMENT', settlementId);
  },
};
