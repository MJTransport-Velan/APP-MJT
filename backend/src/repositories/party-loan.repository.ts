import { Prisma, LoanStatus, LoanBorrowerType } from '@prisma/client';
import { prisma } from '../config/db';

/**
 * Generic, borrowerType-scoped loan storage — shared by
 * driver-loan.repository.ts and employee-loan.repository.ts
 * (architecture optimization pass). Those two files stay the actual
 * public interface every service/consumer calls; this file only knows
 * how to read/write the underlying PartyLoan/PartyLoanInstallment
 * tables. VehicleLoan is deliberately not part of this — see the schema
 * comment on PartyLoan for why.
 */
export const partyLoanRepository = {
  async findManyPaginated(borrowerType: LoanBorrowerType, params: { skip: number; take: number; search?: string; borrowerId?: string; status?: LoanStatus }) {
    const where: Prisma.PartyLoanWhereInput = {
      borrowerType,
      deletedAt: null,
      AND: [
        params.search ? { loanNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.borrowerId ? { borrowerId: params.borrowerId } : {},
        params.status ? { status: params.status } : {},
      ],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.partyLoan.findMany({ where, include: { installments: { orderBy: { installmentNo: 'asc' } } }, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.partyLoan.count({ where }),
    ]);
    return { rows, total };
  },

  findById(borrowerType: LoanBorrowerType, id: string) {
    return prisma.partyLoan.findFirst({ where: { id, borrowerType, deletedAt: null }, include: { installments: { orderBy: { installmentNo: 'asc' } } } });
  },

  findByIdBasic(borrowerType: LoanBorrowerType, id: string) {
    return prisma.partyLoan.findFirst({ where: { id, borrowerType, deletedAt: null } });
  },

  findActiveLoansForBorrower(borrowerType: LoanBorrowerType, borrowerId: string) {
    return prisma.partyLoan.findMany({ where: { borrowerType, borrowerId, status: 'ACTIVE', deletedAt: null }, include: { installments: true } });
  },

  async nextLoanNumber(prefix: string, borrowerType: LoanBorrowerType) {
    const count = await prisma.partyLoan.count({ where: { borrowerType } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${prefix}-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  create(data: Prisma.PartyLoanUncheckedCreateInput) {
    return prisma.partyLoan.create({ data, include: { installments: { orderBy: { installmentNo: 'asc' } } } });
  },

  update(id: string, data: Prisma.PartyLoanUncheckedUpdateInput) {
    return prisma.partyLoan.update({ where: { id }, data, include: { installments: { orderBy: { installmentNo: 'asc' } } } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.partyLoan.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  createInstallments(data: Prisma.PartyLoanInstallmentUncheckedCreateInput[]) {
    return prisma.partyLoanInstallment.createMany({ data });
  },

  findNextDueInstallment(loanId: string) {
    return prisma.partyLoanInstallment.findFirst({ where: { loanId, status: 'PENDING' }, orderBy: { installmentNo: 'asc' } });
  },

  markInstallmentRecovered(id: string, recoveredReferenceType: string, recoveredReferenceId: string) {
    return prisma.partyLoanInstallment.update({ where: { id }, data: { status: 'RECOVERED', recoveredReferenceType, recoveredReferenceId } });
  },

  /** For a borrower's due installments across ALL their active loans (driver-settlement's batch netting needs this shape). */
  findDueInstallmentsForBorrower(borrowerType: LoanBorrowerType, borrowerId: string, periodEnd: Date) {
    return prisma.partyLoanInstallment.findMany({
      where: { status: 'PENDING', dueDate: { lte: periodEnd }, loan: { borrowerType, borrowerId, status: 'ACTIVE', deletedAt: null } },
      orderBy: { dueDate: 'asc' },
    });
  },

  markInstallmentsRecoveredBulk(ids: string[], recoveredReferenceType: string, recoveredReferenceId: string) {
    if (ids.length === 0) return Promise.resolve({ count: 0 });
    return prisma.partyLoanInstallment.updateMany({ where: { id: { in: ids } }, data: { status: 'RECOVERED', recoveredReferenceType, recoveredReferenceId } });
  },
};
