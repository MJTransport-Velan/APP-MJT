import { Prisma, LoanStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { partyLoanRepository } from './party-loan.repository';

const BORROWER_TYPE = 'EMPLOYEE' as const;

/**
 * Thin wrapper over the generic party-loan.repository.ts, scoped to
 * borrowerType=EMPLOYEE (architecture optimization pass — this used to
 * be its own EmployeeLoan/EmployeeLoanInstallment table pair). Every
 * exported function name and returned shape (.employee, .installments
 * with .recoveredInPayrollRunLineId) is unchanged, so
 * employee-loan.service.ts and payroll-run.service.ts needed zero edits.
 *
 * mapLoan/attachRelations are deliberately NOT generic — see the
 * matching comment in driver-loan.repository.ts.
 */
const loanInclude = { installments: { orderBy: { installmentNo: 'asc' as const } } } satisfies Prisma.PartyLoanInclude;
type RawLoan = Prisma.PartyLoanGetPayload<{ include: typeof loanInclude }>;

function mapLoan(r: RawLoan, employeeById: Map<string, { id: string; name: string; employeeCode: string }>) {
  return {
    ...r,
    employee: employeeById.get(r.borrowerId)!,
    installments: r.installments.map((i) => ({ ...i, recoveredInPayrollRunLineId: i.recoveredReferenceId })),
  };
}

async function attachRelations(row: RawLoan): Promise<ReturnType<typeof mapLoan>>;
async function attachRelations(rows: RawLoan[]): Promise<ReturnType<typeof mapLoan>[]>;
async function attachRelations(rowOrRows: RawLoan | RawLoan[]) {
  const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  const employeeIds = [...new Set(rows.map((r) => r.borrowerId))];

  const employees = await prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, name: true, employeeCode: true } });
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const merged = rows.map((r) => mapLoan(r, employeeById));
  return Array.isArray(rowOrRows) ? merged : merged[0];
}

export const employeeLoanRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; employeeId?: string; status?: LoanStatus }) {
    const { rows, total } = await partyLoanRepository.findManyPaginated(BORROWER_TYPE, { ...params, borrowerId: params.employeeId });
    return { rows: await attachRelations(rows), total };
  },

  async findById(id: string) {
    const loan = await partyLoanRepository.findById(BORROWER_TYPE, id);
    return loan ? attachRelations(loan) : null;
  },

  async findByIdBasic(id: string) {
    const loan = await partyLoanRepository.findByIdBasic(BORROWER_TYPE, id);
    return loan ? { ...loan, employeeId: loan.borrowerId } : null;
  },

  findEmployeeById(id: string) {
    return prisma.employee.findFirst({ where: { id, deletedAt: null } });
  },

  findActiveLoansForEmployee(employeeId: string) {
    return partyLoanRepository.findActiveLoansForBorrower(BORROWER_TYPE, employeeId);
  },

  findNextDueInstallment(loanId: string) {
    return partyLoanRepository.findNextDueInstallment(loanId);
  },

  markInstallmentRecovered(id: string, payrollRunLineId: string) {
    return partyLoanRepository.markInstallmentRecovered(id, 'PAYROLL_RUN_LINE', payrollRunLineId);
  },

  nextLoanNumber() {
    return partyLoanRepository.nextLoanNumber('ELN', BORROWER_TYPE);
  },

  async create(data: { loanNumber: string; employeeId: string; loanType: string; principalAmount: number; tenureMonths: number; emiAmount: number; createdById: string; updatedById: string }) {
    const loan = await partyLoanRepository.create({
      loanNumber: data.loanNumber,
      borrowerType: BORROWER_TYPE,
      borrowerId: data.employeeId,
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

  createInstallments(data: { loanId: string; installmentNo: number; dueDate: Date; emiAmount: number }[]) {
    return partyLoanRepository.createInstallments(data);
  },

  softDelete(id: string, updatedById: string) {
    return partyLoanRepository.softDelete(id, updatedById);
  },
};

export type EmployeeLoanWithRelations = NonNullable<Awaited<ReturnType<typeof employeeLoanRepository.findById>>>;
