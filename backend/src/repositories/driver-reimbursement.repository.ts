import { Prisma, ApprovalStatus } from '@prisma/client';
import { prisma } from '../config/db';

const reimbursementWithRelations = Prisma.validator<Prisma.DriverExpenseReimbursementInclude>()({
  driver: true,
  trip: { select: { id: true, tripNumber: true } },
  vehicle: { select: { id: true, registrationNumber: true } },
});

export type DriverReimbursementWithRelations = Prisma.DriverExpenseReimbursementGetPayload<{ include: typeof reimbursementWithRelations }>;

export const driverReimbursementRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; driverId?: string; approvalStatus?: ApprovalStatus; isSettled?: boolean }) {
    const where: Prisma.DriverExpenseReimbursementWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { reimbursementNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.driverId ? { driverId: params.driverId } : {},
        params.approvalStatus ? { approvalStatus: params.approvalStatus } : {},
        params.isSettled !== undefined ? { isSettled: params.isSettled } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.driverExpenseReimbursement.findMany({ where, include: reimbursementWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.driverExpenseReimbursement.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.driverExpenseReimbursement.findFirst({ where: { id, deletedAt: null }, include: reimbursementWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.driverExpenseReimbursement.findFirst({ where: { id, deletedAt: null } });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  async nextReimbursementNumber() {
    const count = await prisma.driverExpenseReimbursement.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `DER-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  create(data: Prisma.DriverExpenseReimbursementUncheckedCreateInput) {
    return prisma.driverExpenseReimbursement.create({ data, include: reimbursementWithRelations });
  },

  update(id: string, data: Prisma.DriverExpenseReimbursementUncheckedUpdateInput) {
    return prisma.driverExpenseReimbursement.update({ where: { id }, data, include: reimbursementWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.driverExpenseReimbursement.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
