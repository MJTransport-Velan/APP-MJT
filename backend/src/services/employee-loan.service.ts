import { Request } from 'express';
import { employeeLoanRepository, EmployeeLoanWithRelations } from '../repositories/employee-loan.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { calculateEmiAmount, generateEmiSchedule } from '../utils/loanSchedule.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateEmployeeLoanInput } from '../validators/employee-loan.validator';

function serialize(loan: EmployeeLoanWithRelations) {
  const recovered = loan.installments.filter((i) => i.status === 'RECOVERED').reduce((sum, i) => sum + Number(i.emiAmount), 0);
  return {
    id: loan.id,
    loanNumber: loan.loanNumber,
    loanType: loan.loanType,
    principalAmount: loan.principalAmount,
    tenureMonths: loan.tenureMonths,
    emiAmount: loan.emiAmount,
    status: loan.status,
    outstandingPrincipal: Number(loan.principalAmount) - recovered,
    employee: { id: loan.employee.id, name: loan.employee.name, employeeCode: loan.employee.employeeCode },
    installments: loan.installments.map((i) => ({ id: i.id, installmentNo: i.installmentNo, dueDate: i.dueDate, emiAmount: i.emiAmount, status: i.status })),
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
}

export const employeeLoanService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await employeeLoanRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      employeeId: (query.employeeId as string) || undefined,
      status: (query.status as never) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const loan = await employeeLoanRepository.findById(id);
    if (!loan) throw new AppError('Employee Loan not found', 404);
    return serialize(loan);
  },

  async request(input: CreateEmployeeLoanInput, actorId: string) {
    const employee = await employeeLoanRepository.findEmployeeById(input.employeeId);
    if (!employee) throw new AppError('Employee not found', 404);
    if (!employee.isActive) throw new AppError('Cannot record a loan for an inactive employee', 409);

    const emiAmount = calculateEmiAmount(input.principalAmount, input.tenureMonths);
    const loanNumber = await employeeLoanRepository.nextLoanNumber();
    const loan = await employeeLoanRepository.create({
      loanNumber,
      employeeId: input.employeeId,
      loanType: input.loanType,
      principalAmount: input.principalAmount,
      tenureMonths: input.tenureMonths,
      emiAmount,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'EmployeeLoan', entityId: loan.id, description: `Requested employee loan ${loan.loanNumber} (${loan.loanType}) of ${loan.principalAmount} for ${employee.name}` });
    return employeeLoanService.getById(loan.id);
  },

  /** Approval disburses the loan — debits the fund account directly for the principal — and generates the EMI installment schedule. */
  async approve(id: string, actorId: string) {
    const existing = await employeeLoanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Employee Loan not found', 404);
    if (existing.status !== 'PENDING_APPROVAL') throw new AppError(`Loan is already ${existing.status}`, 409);

    const employee = await employeeLoanRepository.findEmployeeById(existing.employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, undefined, undefined);
    if (!fundAccount.isActive) throw new AppError('The default Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -Number(existing.principalAmount));

    const today = new Date().toISOString().slice(0, 10);
    const schedule = generateEmiSchedule(Number(existing.principalAmount), existing.tenureMonths, Number(existing.emiAmount), new Date(`${today}T00:00:00.000Z`));
    await employeeLoanRepository.createInstallments(schedule.map((s) => ({ loanId: id, installmentNo: s.installmentNo, dueDate: s.dueDate, emiAmount: s.emiAmount })));

    await employeeLoanRepository.update(id, {
      status: 'ACTIVE',
      approvedById: actorId,
      organizationId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'EmployeeLoan', entityId: id, description: `Approved and disbursed employee loan ${existing.loanNumber} to ${employee.name} — paid from ${fundAccount.label}` });
    return employeeLoanService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await employeeLoanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Employee Loan not found', 404);
    if (existing.status !== 'PENDING_APPROVAL') throw new AppError(`Loan is already ${existing.status}`, 409);

    await employeeLoanRepository.update(id, { status: 'REJECTED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'EmployeeLoan', entityId: id, description: `Rejected employee loan ${existing.loanNumber}${reason ? `: ${reason}` : ''}` });
    return employeeLoanService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await employeeLoanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Employee Loan not found', 404);
    if (existing.status === 'ACTIVE' || existing.status === 'CLOSED') throw new AppError('Cannot delete a loan that has already been disbursed', 409);

    await employeeLoanRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'EmployeeLoan', entityId: id, description: `Deleted employee loan ${existing.loanNumber}` });
  },
};
