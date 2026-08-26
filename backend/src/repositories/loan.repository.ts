import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const loanWithRelations = Prisma.validator<Prisma.LoanInclude>()({
  vehicle: { select: { id: true, registrationNumber: true } },
  fixedAsset: { select: { id: true, assetCode: true, assetName: true } },
  capitalPartner: { select: { id: true, name: true } },
  installments: { orderBy: { installmentNo: 'asc' } },
});

export type LoanWithRelations = Prisma.LoanGetPayload<{ include: typeof loanWithRelations }>;

export const loanRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; loanType?: string; status?: string; vehicleId?: string }) {
    const where: Prisma.LoanWhereInput = {
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { loanNumber: { contains: params.search, mode: 'insensitive' } },
                { loanName: { contains: params.search, mode: 'insensitive' } },
                { lenderName: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.loanType ? { loanType: params.loanType as never } : {},
        params.status ? { status: params.status as never } : {},
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.loan.findMany({ where, include: loanWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.loan.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.loan.findFirst({ where: { id, deletedAt: null }, include: loanWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.loan.findFirst({ where: { id, deletedAt: null } });
  },

  findInstallment(loanId: string, installmentId: string) {
    return prisma.loanInstallment.findFirst({ where: { id: installmentId, loanId } });
  },

  countPaidInstallments(loanId: string) {
    return prisma.loanInstallment.count({ where: { loanId, status: 'PAID' } });
  },

  async nextLoanNumber() {
    return nextDocumentNumber('LOAN', 4, async (stamp) => {
      const rows = await prisma.loan.findMany({
        where: { loanNumber: { startsWith: `LOAN-${stamp}-` } },
        select: { loanNumber: true },
      });
      return highestSequenceToday(rows, 'loanNumber', 'LOAN', stamp);
    });
  },

  /** Creates the loan and its full EMI schedule in one transaction — a loan without a schedule is never a valid state. */
  createWithSchedule(data: Prisma.LoanUncheckedCreateInput, installments: Prisma.LoanInstallmentUncheckedCreateWithoutLoanInput[]) {
    return prisma.loan.create({
      data: { ...data, installments: { create: installments } },
      include: loanWithRelations,
    });
  },

  update(id: string, data: Prisma.LoanUncheckedUpdateInput) {
    return prisma.loan.update({ where: { id }, data, include: loanWithRelations });
  },

  updateInstallment(id: string, data: Prisma.LoanInstallmentUncheckedUpdateInput) {
    return prisma.loanInstallment.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.loan.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  /**
   * Marks every PENDING installment whose due date has passed as OVERDUE.
   * Called on read rather than by a scheduler — the dashboard/list is the
   * only place the distinction is visible, and this keeps the module free
   * of a cron dependency.
   */
  markOverdue(now: Date) {
    return prisma.loanInstallment.updateMany({
      where: { status: 'PENDING', dueDate: { lt: now }, loan: { status: 'ACTIVE', deletedAt: null } },
      data: { status: 'OVERDUE' },
    });
  },

  /** Every installment across all active loans, for the EMI dashboard. */
  findInstallmentsForDashboard(params: { dateFrom?: Date; dateTo?: Date; vehicleId?: string; loanType?: string; status?: string }) {
    return prisma.loanInstallment.findMany({
      where: {
        loan: {
          deletedAt: null,
          ...(params.vehicleId ? { vehicleId: params.vehicleId } : {}),
          ...(params.loanType ? { loanType: params.loanType as never } : {}),
        },
        ...(params.status ? { status: params.status as never } : {}),
        ...(params.dateFrom || params.dateTo
          ? { dueDate: { ...(params.dateFrom ? { gte: params.dateFrom } : {}), ...(params.dateTo ? { lte: params.dateTo } : {}) } }
          : {}),
      },
      include: {
        loan: {
          select: {
            id: true,
            loanNumber: true,
            loanName: true,
            lenderName: true,
            loanType: true,
            status: true,
            vehicle: { select: { id: true, registrationNumber: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  },

  findAllActiveWithInstallments() {
    return prisma.loan.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      include: { installments: true },
    });
  },
};
