import { Prisma, ApprovalStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const advanceWithRelations = Prisma.validator<Prisma.EmployeeAdvanceInclude>()({
  employee: true,
  paymentMode: { select: { id: true, name: true } },
});

export type EmployeeAdvanceWithRelations = Prisma.EmployeeAdvanceGetPayload<{ include: typeof advanceWithRelations }>;

export const employeeAdvanceRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; employeeId?: string; approvalStatus?: ApprovalStatus; isSettled?: boolean }) {
    const where: Prisma.EmployeeAdvanceWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { advanceNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.employeeId ? { employeeId: params.employeeId } : {},
        params.approvalStatus ? { approvalStatus: params.approvalStatus } : {},
        params.isSettled !== undefined ? { isSettled: params.isSettled } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.employeeAdvance.findMany({ where, include: advanceWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.employeeAdvance.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.employeeAdvance.findFirst({ where: { id, deletedAt: null }, include: advanceWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.employeeAdvance.findFirst({ where: { id, deletedAt: null } });
  },

  findEmployeeById(id: string) {
    return prisma.employee.findFirst({ where: { id, deletedAt: null } });
  },

  findUnsettledForEmployee(employeeId: string) {
    return prisma.employeeAdvance.findMany({ where: { employeeId, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null } });
  },

  async nextAdvanceNumber() {
    return nextDocumentNumber('EAV', 4, async (stamp) => {
      const rows = await prisma.employeeAdvance.findMany({
        where: { advanceNumber: { startsWith: `EAV-${stamp}-` } },
        select: { advanceNumber: true },
      });
      return highestSequenceToday(rows, 'advanceNumber', 'EAV', stamp);
    });
  },

  create(data: Prisma.EmployeeAdvanceUncheckedCreateInput) {
    return prisma.employeeAdvance.create({ data, include: advanceWithRelations });
  },

  update(id: string, data: Prisma.EmployeeAdvanceUncheckedUpdateInput) {
    return prisma.employeeAdvance.update({ where: { id }, data, include: advanceWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.employeeAdvance.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
