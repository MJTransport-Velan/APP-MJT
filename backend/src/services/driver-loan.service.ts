import { Request } from 'express';
import { driverLoanRepository, DriverLoanWithRelations } from '../repositories/driver-loan.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { calculateEmiAmount, generateEmiSchedule } from '../utils/loanSchedule.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateDriverLoanInput } from '../validators/driver-loan.validator';

function serialize(loan: DriverLoanWithRelations) {
  const recovered = loan.installments.filter((i) => i.status === 'RECOVERED').reduce((sum, i) => sum + Number(i.emiAmount), 0);
  return {
    id: loan.id,
    loanNumber: loan.loanNumber,
    loanType: loan.loanType,
    principalAmount: loan.principalAmount,
    tenureMonths: loan.tenureMonths,
    emiAmount: loan.emiAmount,
    interestRate: loan.interestRate,
    status: loan.status,
    outstandingPrincipal: Number(loan.principalAmount) - recovered,
    driver: { id: loan.driver.id, name: loan.driver.name, code: loan.driver.code },
    installments: loan.installments.map((i) => ({ id: i.id, installmentNo: i.installmentNo, dueDate: i.dueDate, emiAmount: i.emiAmount, status: i.status, recoveredSettlementId: i.recoveredSettlementId })),
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
}

export const driverLoanService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await driverLoanRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      driverId: (query.driverId as string) || undefined,
      status: (query.status as never) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const loan = await driverLoanRepository.findById(id);
    if (!loan) throw new AppError('Driver Loan not found', 404);
    return serialize(loan);
  },

  async request(input: CreateDriverLoanInput, actorId: string) {
    const driver = await driverLoanRepository.findDriverById(input.driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    if (!driver.isActive) throw new AppError('Cannot record a loan for an inactive driver', 409);

    const emiAmount = calculateEmiAmount(input.principalAmount, input.tenureMonths);
    const loanNumber = await driverLoanRepository.nextLoanNumber();
    const loan = await driverLoanRepository.create({
      loanNumber,
      driverId: input.driverId,
      loanType: input.loanType,
      principalAmount: input.principalAmount,
      tenureMonths: input.tenureMonths,
      emiAmount,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'DriverLoan',
      entityId: loan.id,
      description: `Requested driver loan ${loan.loanNumber} (${loan.loanType}) of ${loan.principalAmount} for ${driver.name}`,
    });

    return driverLoanService.getById(loan.id);
  },

  /** Approval disburses the loan — debits the fund account directly for the principal — and generates the EMI installment schedule (design doc §6.7). */
  async approve(id: string, actorId: string) {
    const existing = await driverLoanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Loan not found', 404);
    if (existing.status !== 'PENDING_APPROVAL') throw new AppError(`Loan is already ${existing.status}`, 409);

    const driver = await driverLoanRepository.findDriverById(existing.driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, undefined, undefined);
    if (!fundAccount.isActive) throw new AppError('The default Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -Number(existing.principalAmount));

    const today = new Date().toISOString().slice(0, 10);
    const schedule = generateEmiSchedule(Number(existing.principalAmount), existing.tenureMonths, Number(existing.emiAmount), new Date(`${today}T00:00:00.000Z`));
    await driverLoanRepository.createInstallments(
      schedule.map((s) => ({ loanId: id, installmentNo: s.installmentNo, dueDate: s.dueDate, emiAmount: s.emiAmount }))
    );

    await driverLoanRepository.update(id, {
      status: 'ACTIVE',
      approvedById: actorId,
      organizationId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverLoan', entityId: id, description: `Approved and disbursed driver loan ${existing.loanNumber} to ${driver.name} — paid from ${fundAccount.label}` });
    return driverLoanService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await driverLoanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Loan not found', 404);
    if (existing.status !== 'PENDING_APPROVAL') throw new AppError(`Loan is already ${existing.status}`, 409);

    await driverLoanRepository.update(id, { status: 'REJECTED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverLoan', entityId: id, description: `Rejected driver loan ${existing.loanNumber}${reason ? `: ${reason}` : ''}` });
    return driverLoanService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await driverLoanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Loan not found', 404);
    if (existing.status === 'ACTIVE' || existing.status === 'CLOSED') throw new AppError('Cannot delete a loan that has already been disbursed', 409);

    await driverLoanRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'DriverLoan', entityId: id, description: `Deleted driver loan ${existing.loanNumber}` });
  },
};
