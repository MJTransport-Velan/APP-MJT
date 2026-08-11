import { Prisma, LoanStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { partyLoanRepository } from './party-loan.repository';

const BORROWER_TYPE = 'DRIVER' as const;

/**
 * Thin wrapper over the generic party-loan.repository.ts, scoped to
 * borrowerType=DRIVER (architecture optimization pass — this used to be
 * its own DriverLoan/DriverLoanInstallment table pair). Every exported
 * function name and returned shape (.driver, .installments with
 * .recoveredSettlementId) is unchanged, so driver-loan.service.ts and
 * driver-settlement.repository.ts needed zero edits.
 *
 * mapLoan/attachRelations are deliberately NOT generic: a generic
 * parameter indexed into a nested array (r.installments.map(...)) loses
 * the spread-merged fields when TS infers the function's return type
 * against a real Prisma payload argument (confirmed via isolated repro
 * during this migration) — a concrete Prisma.PartyLoanGetPayload type
 * sidesteps the issue entirely.
 */
const loanInclude = { installments: { orderBy: { installmentNo: 'asc' as const } } } satisfies Prisma.PartyLoanInclude;
type RawLoan = Prisma.PartyLoanGetPayload<{ include: typeof loanInclude }>;

function mapLoan(r: RawLoan, driverById: Map<string, { id: string; name: string; code: string }>) {
  return {
    ...r,
    driver: driverById.get(r.borrowerId)!,
    installments: r.installments.map((i) => ({ ...i, recoveredSettlementId: i.recoveredReferenceId })),
  };
}

async function attachRelations(row: RawLoan): Promise<ReturnType<typeof mapLoan>>;
async function attachRelations(rows: RawLoan[]): Promise<ReturnType<typeof mapLoan>[]>;
async function attachRelations(rowOrRows: RawLoan | RawLoan[]) {
  const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  const driverIds = [...new Set(rows.map((r) => r.borrowerId))];

  const drivers = await prisma.driver.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true, code: true } });
  const driverById = new Map(drivers.map((d) => [d.id, d]));

  const merged = rows.map((r) => mapLoan(r, driverById));
  return Array.isArray(rowOrRows) ? merged : merged[0];
}

export const driverLoanRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; driverId?: string; status?: LoanStatus }) {
    const { rows, total } = await partyLoanRepository.findManyPaginated(BORROWER_TYPE, { ...params, borrowerId: params.driverId });
    return { rows: await attachRelations(rows), total };
  },

  async findById(id: string) {
    const loan = await partyLoanRepository.findById(BORROWER_TYPE, id);
    return loan ? attachRelations(loan) : null;
  },

  async findByIdBasic(id: string) {
    const loan = await partyLoanRepository.findByIdBasic(BORROWER_TYPE, id);
    return loan ? { ...loan, driverId: loan.borrowerId } : null;
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  findActiveLoansForDriver(driverId: string) {
    return partyLoanRepository.findActiveLoansForBorrower(BORROWER_TYPE, driverId);
  },

  nextLoanNumber() {
    return partyLoanRepository.nextLoanNumber('DLN', BORROWER_TYPE);
  },

  async create(data: { loanNumber: string; driverId: string; loanType: string; principalAmount: number; tenureMonths: number; emiAmount: number; createdById: string; updatedById: string }) {
    const loan = await partyLoanRepository.create({
      loanNumber: data.loanNumber,
      borrowerType: BORROWER_TYPE,
      borrowerId: data.driverId,
      loanType: data.loanType as never,
      principalAmount: data.principalAmount,
      tenureMonths: data.tenureMonths,
      emiAmount: data.emiAmount,
      createdById: data.createdById,
      updatedById: data.updatedById,
    });
    return attachRelations(loan);
  },

  async update(id: string, data: Record<string, unknown>) {
    const loan = await partyLoanRepository.update(id, data as Prisma.PartyLoanUncheckedUpdateInput);
    return attachRelations(loan);
  },

  softDelete(id: string, updatedById: string) {
    return partyLoanRepository.softDelete(id, updatedById);
  },

  createInstallments(data: { loanId: string; installmentNo: number; dueDate: Date; emiAmount: number }[]) {
    return partyLoanRepository.createInstallments(data);
  },

  findNextDueInstallment(loanId: string) {
    return partyLoanRepository.findNextDueInstallment(loanId);
  },

  markInstallmentRecovered(id: string, settlementId: string) {
    return partyLoanRepository.markInstallmentRecovered(id, 'DRIVER_SETTLEMENT', settlementId);
  },

  sumOutstanding(loan: { principalAmount: number | { toString(): string }; installments: { emiAmount: number | { toString(): string }; status: string }[] }) {
    const recovered = loan.installments.filter((i) => i.status === 'RECOVERED').reduce((sum, i) => sum + Number(i.emiAmount), 0);
    return Number(loan.principalAmount) - recovered;
  },
};

export type DriverLoanWithRelations = NonNullable<Awaited<ReturnType<typeof driverLoanRepository.findById>>>;
