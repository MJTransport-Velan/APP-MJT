import { Request } from 'express';
import { prisma } from '../config/db';
import { vehicleLoanRepository, VehicleLoanWithRelations } from '../repositories/vehicle-loan.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { calculateVehicleLoanEmi, generateVehicleLoanSchedule } from '../utils/vehicleLoanSchedule.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateVehicleLoanInput, CreateDisbursementInput, PayInstallmentInput } from '../validators/vehicle-loan.validator';

function countPendingInstallments(loanId: string) {
  return prisma.vehicleLoanInstallment.count({ where: { loanId, status: { in: ['PENDING', 'OVERDUE'] } } });
}

function findNextPendingInstallment(loanId: string) {
  return prisma.vehicleLoanInstallment.findFirst({ where: { loanId, status: { in: ['PENDING', 'OVERDUE'] } }, orderBy: { installmentNo: 'asc' } });
}

function serialize(loan: VehicleLoanWithRelations) {
  const paid = loan.installments.filter((i) => i.status === 'PAID');
  const outstandingPrincipal = Number(loan.principalAmount) - paid.reduce((s, i) => s + Number(i.principalComponent), 0);
  return {
    id: loan.id,
    loanNumber: loan.loanNumber,
    lenderType: loan.lenderType,
    lenderName: loan.lenderName,
    loanAccountNumber: loan.loanAccountNumber,
    principalAmount: loan.principalAmount,
    processingFee: loan.processingFee,
    interestRatePercent: loan.interestRatePercent,
    disbursementDate: loan.disbursementDate,
    emiStartDate: loan.emiStartDate,
    emiAmount: loan.emiAmount,
    tenureMonths: loan.tenureMonths,
    status: loan.status,
    outstandingPrincipal: Math.max(Math.round(outstandingPrincipal * 100) / 100, 0),
    vehicle: { id: loan.vehicle.id, registrationNumber: loan.vehicle.registrationNumber },
    fixedAsset: loan.fixedAsset ? { id: loan.fixedAsset.id, assetCode: loan.fixedAsset.assetCode } : null,
    installments: loan.installments.map((i) => ({
      id: i.id,
      installmentNo: i.installmentNo,
      dueDate: i.dueDate,
      emiAmount: i.emiAmount,
      principalComponent: i.principalComponent,
      interestComponent: i.interestComponent,
      lateFeeAmount: i.lateFeeAmount,
      status: i.status,
      paidDate: i.paidDate,
    })),
    disbursements: loan.disbursements,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
}

export const vehicleLoanService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await vehicleLoanRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      vehicleId: (query.vehicleId as string) || undefined,
      status: (query.status as never) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const loan = await vehicleLoanRepository.findById(id);
    if (!loan) throw new AppError('Vehicle Loan not found', 404);
    return serialize(loan);
  },

  async request(input: CreateVehicleLoanInput, actorId: string) {
    const vehicle = await vehicleLoanRepository.findVehicleById(input.vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    if (!vehicle.isActive) throw new AppError('Cannot record a loan for an inactive vehicle', 409);

    const emiAmount = calculateVehicleLoanEmi(input.principalAmount, input.interestRatePercent, input.tenureMonths);
    const loanNumber = await vehicleLoanRepository.nextLoanNumber();
    const loan = await vehicleLoanRepository.create({
      loanNumber,
      vehicleId: input.vehicleId,
      lenderType: input.lenderType,
      lenderName: input.lenderName,
      loanAccountNumber: input.loanAccountNumber,
      principalAmount: input.principalAmount,
      processingFee: input.processingFee ?? 0,
      interestRatePercent: input.interestRatePercent,
      disbursementDate: new Date(input.disbursementDate),
      emiStartDate: new Date(input.emiStartDate),
      emiAmount,
      tenureMonths: input.tenureMonths,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'VehicleLoan', entityId: loan.id, description: `Requested vehicle loan ${loan.loanNumber} of ${loan.principalAmount} from ${loan.lenderName}` });
    return vehicleLoanService.getById(loan.id);
  },

  /** No fund movement here — approval generates the EMI schedule; the actual fund movement is posted either by FixedAsset.approve() (if this loan funds a purchase) or by a VehicleLoanDisbursement (design doc §6.2/§14). */
  async approve(id: string, actorId: string) {
    const existing = await vehicleLoanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Vehicle Loan not found', 404);
    if (existing.status !== 'PENDING_APPROVAL') throw new AppError(`Loan is already ${existing.status}`, 409);

    const organizationId = await organizationService.resolveOrganizationId(undefined);

    const schedule = generateVehicleLoanSchedule(
      Number(existing.principalAmount),
      Number(existing.interestRatePercent),
      existing.tenureMonths,
      Number(existing.emiAmount),
      existing.emiStartDate
    );
    await vehicleLoanRepository.createInstallments(
      schedule.map((s) => ({
        loanId: id,
        installmentNo: s.installmentNo,
        dueDate: s.dueDate,
        emiAmount: s.emiAmount,
        principalComponent: s.principalComponent,
        interestComponent: s.interestComponent,
      }))
    );

    await vehicleLoanRepository.update(id, {
      status: 'ACTIVE',
      approvedById: actorId,
      organizationId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleLoan', entityId: id, description: `Approved vehicle loan ${existing.loanNumber} — EMI schedule generated` });
    return vehicleLoanService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await vehicleLoanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Vehicle Loan not found', 404);
    if (existing.status !== 'PENDING_APPROVAL') throw new AppError(`Loan is already ${existing.status}`, 409);

    await vehicleLoanRepository.update(id, { status: 'REJECTED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleLoan', entityId: id, description: `Rejected vehicle loan ${existing.loanNumber}${reason ? `: ${reason}` : ''}` });
    return vehicleLoanService.getById(id);
  },

  /** An additional disbursement tranche NOT tied to an asset purchase (design doc §6.1's "Multiple Loan Disbursements") — credits the fund account directly with the tranche received from the lender. */
  async disburse(loanId: string, input: CreateDisbursementInput, actorId: string) {
    const loan = await vehicleLoanRepository.findByIdBasic(loanId);
    if (!loan) throw new AppError('Vehicle Loan not found', 404);
    if (loan.status !== 'ACTIVE') throw new AppError('Loan must be ACTIVE before disbursement', 409);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    const today = new Date().toISOString().slice(0, 10);
    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, input.amount);

    const disbursement = await vehicleLoanRepository.createDisbursement({
      loanId,
      disbursementDate: new Date(input.disbursementDate ?? today),
      amount: input.amount,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'VehicleLoanDisbursement', entityId: disbursement.id, description: `Recorded disbursement of ${input.amount} for vehicle loan ${loan.loanNumber} into ${fundAccount.label}` });
    return vehicleLoanService.getById(loanId);
  },

  /** Regular EMI: directly debits the fund account for the full principal + interest + late fee — the principal/interest split is kept on the installment row for reporting, but no ledger posting is made for it anymore (design doc §6.4). */
  async payInstallment(loanId: string, installmentId: string, input: PayInstallmentInput, actorId: string) {
    const loan = await vehicleLoanRepository.findByIdBasic(loanId);
    if (!loan) throw new AppError('Vehicle Loan not found', 404);

    const installment = await vehicleLoanRepository.findInstallmentById(installmentId);
    if (!installment || installment.loanId !== loanId) throw new AppError('Installment not found', 404);
    if (installment.status !== 'PENDING' && installment.status !== 'OVERDUE') throw new AppError(`Installment has already been ${installment.status.toLowerCase()}`, 409);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    const lateFee = input.lateFeeAmount ?? 0;
    const totalAmount = Number(installment.principalComponent) + Number(installment.interestComponent) + lateFee;
    const today = new Date().toISOString().slice(0, 10);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -totalAmount);

    await vehicleLoanRepository.updateInstallment(installmentId, {
      status: 'PAID',
      lateFeeAmount: lateFee,
      paidDate: new Date(today),
    });

    const remainingPending = await countPendingInstallments(loanId);
    if (remainingPending === 0) {
      await vehicleLoanRepository.update(loanId, { status: 'CLOSED', updatedById: actorId });
    }

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleLoanInstallment', entityId: installmentId, description: `Paid EMI #${installment.installmentNo} for vehicle loan ${loan.loanNumber} from ${fundAccount.label}` });
    return vehicleLoanService.getById(loanId);
  },

  /** Pays the full live-computed outstanding principal plus the next installment's accrued interest directly out of the fund account, then waives all remaining installments (design doc §6.5). */
  async foreclose(loanId: string, input: PayInstallmentInput, actorId: string) {
    const loan = await vehicleLoanRepository.findByIdBasic(loanId);
    if (!loan) throw new AppError('Vehicle Loan not found', 404);
    if (loan.status !== 'ACTIVE') throw new AppError('Only an active loan can be foreclosed', 409);

    const paidSum = await vehicleLoanRepository.sumPrincipalPaid(loanId);
    const outstandingPrincipal = Math.round((Number(loan.principalAmount) - Number(paidSum._sum.principalComponent || 0)) * 100) / 100;
    if (outstandingPrincipal <= 0) throw new AppError('This loan has no outstanding principal to foreclose', 409);

    const nextInstallment = await findNextPendingInstallment(loanId);
    const finalInterest = nextInstallment ? Number(nextInstallment.interestComponent) : 0;

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -(outstandingPrincipal + finalInterest));

    await vehicleLoanRepository.updateManyInstallments(loanId, { status: 'PENDING' }, { status: 'WAIVED' });
    await vehicleLoanRepository.update(loanId, { status: 'FORECLOSED', updatedById: actorId });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleLoan', entityId: loanId, description: `Foreclosed vehicle loan ${loan.loanNumber} from ${fundAccount.label}` });
    return vehicleLoanService.getById(loanId);
  },

  async remove(id: string, actorId: string) {
    const existing = await vehicleLoanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Vehicle Loan not found', 404);
    if (existing.status === 'ACTIVE' || existing.status === 'CLOSED' || existing.status === 'FORECLOSED') {
      throw new AppError('Cannot delete a loan that has already been approved', 409);
    }
    await vehicleLoanRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'VehicleLoan', entityId: id, description: `Deleted vehicle loan ${existing.loanNumber}` });
  },
};
