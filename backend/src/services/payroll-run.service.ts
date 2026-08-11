import { Request } from 'express';
import { payrollRunRepository, PayrollRunWithRelations } from '../repositories/payroll-run.repository';
import { employeeAdvanceRepository } from '../repositories/employee-advance.repository';
import { employeeLoanRepository } from '../repositories/employee-loan.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreatePayrollRunInput } from '../validators/payroll-run.validator';

function serialize(run: PayrollRunWithRelations) {
  return {
    id: run.id,
    runNumber: run.runNumber,
    periodType: run.periodType,
    periodStart: run.periodStart,
    periodEnd: run.periodEnd,
    runType: run.runType,
    status: run.status,
    lines: run.lines.map((l) => ({
      id: l.id,
      employee: { id: l.employee.id, name: l.employee.name, employeeCode: l.employee.employeeCode },
      grossEarnings: l.grossEarnings,
      totalDeductions: l.totalDeductions,
      netPay: l.netPay,
      components: l.components.map((c) => ({ componentType: c.componentType, name: c.name, amount: c.amount, isEarning: c.isEarning })),
    })),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

/**
 * Computes one employee's payslip without persisting anything — shared by
 * calculate() and the eventual pay() step so the two never drift. Statutory
 * deductions (PF/ESI/PT/TDS) always credit their real liability ledger;
 * everything else non-earning nets straight against Salary Expense — the
 * design doc §13 balance proof this keeps to.
 */
async function computeLineForEmployee(employeeId: string) {
  const structure = await payrollRunRepository.findActiveSalaryStructure(employeeId);
  if (!structure) return null;

  const components = structure.components;
  const grossEarnings = components.filter((c) => c.isEarning).reduce((s, c) => s + Number(c.value), 0);
  const bonusAmount = components.filter((c) => c.componentType === 'BONUS').reduce((s, c) => s + Number(c.value), 0);
  const regularEarnings = grossEarnings - bonusAmount;

  const statutory: Record<string, number> = { PF: 0, ESI: 0, PROFESSIONAL_TAX: 0, TDS: 0 };
  let otherDeductions = 0;
  for (const c of components) {
    if (c.isEarning) continue;
    if (c.componentType in statutory) statutory[c.componentType] += Number(c.value);
    else otherDeductions += Number(c.value);
  }
  const statutoryTotal = Object.values(statutory).reduce((s, v) => s + v, 0);
  const salaryPayable = Math.round((grossEarnings - statutoryTotal - otherDeductions) * 100) / 100;

  const advances = await employeeAdvanceRepository.findUnsettledForEmployee(employeeId);
  const advanceRecoveryTotal = advances.reduce((s, a) => s + Number(a.amount), 0);

  const activeLoans = await employeeLoanRepository.findActiveLoansForEmployee(employeeId);
  const dueInstallments = activeLoans
    .map((loan) => loan.installments.find((i) => i.status === 'PENDING'))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));
  const loanRecoveryTotal = dueInstallments.reduce((s, i) => s + Number(i.emiAmount), 0);

  // Recovering more than this cycle's salaryPayable would force a negative
  // disbursement — skip recovery entirely this cycle rather than partially
  // apply it, and let it carry forward untouched (design doc §8 Loan Rules).
  const requestedRecoveries = advanceRecoveryTotal + loanRecoveryTotal;
  const applyRecoveries = requestedRecoveries <= salaryPayable;
  const recoveries = applyRecoveries ? requestedRecoveries : 0;
  const netPay = Math.round((salaryPayable - recoveries) * 100) / 100;

  return {
    components,
    grossEarnings,
    bonusAmount,
    regularEarnings,
    statutory,
    statutoryTotal,
    otherDeductions,
    salaryPayable,
    netPay,
    totalDeductions: Math.round((statutoryTotal + otherDeductions + recoveries) * 100) / 100,
    settledAdvanceIds: applyRecoveries ? advances.map((a) => a.id) : [],
    settledInstallmentIds: applyRecoveries ? dueInstallments.map((i) => i.id) : [],
  };
}

export const payrollRunService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await payrollRunRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      status: (query.status as never) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const run = await payrollRunRepository.findById(id);
    if (!run) throw new AppError('Payroll Run not found', 404);
    return serialize(run);
  },

  async create(input: CreatePayrollRunInput, actorId: string) {
    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(`${input.periodEnd}T23:59:59.999Z`);

    const overlapping = await payrollRunRepository.findOverlapping(input.periodType, periodStart, periodEnd);
    if (overlapping) throw new AppError(`A payroll run (${overlapping.runNumber}) already covers an overlapping period for ${input.periodType}`, 409);

    const runNumber = await payrollRunRepository.nextRunNumber();
    const run = await payrollRunRepository.create({
      runNumber,
      periodType: input.periodType,
      periodStart,
      periodEnd,
      runType: input.runType ?? 'REGULAR',
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'PayrollRun', entityId: run.id, description: `Created payroll run ${run.runNumber} (${run.periodType}, ${input.periodStart} to ${input.periodEnd})` });
    return payrollRunService.getById(run.id);
  },

  /** Recalculable while DRAFT/CALCULATED — regenerates every PayrollRunLine/Component from scratch (design doc §13). */
  async calculate(id: string, actorId: string, employeeIds?: string[]) {
    const existing = await payrollRunRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Payroll Run not found', 404);
    if (existing.status === 'PAID' || existing.status === 'CANCELLED') throw new AppError(`Cannot recalculate a ${existing.status} payroll run`, 409);

    const employees =
      existing.periodType === 'DAILY_WAGE' || existing.periodType === 'CONTRACT'
        ? await Promise.all((employeeIds ?? []).map((eid) => payrollRunRepository.findEmployeeById(eid)))
        : await payrollRunRepository.findActiveEmployees();

    await payrollRunRepository.deleteLines(id);

    for (const employee of employees) {
      if (!employee) continue;
      const computed = await computeLineForEmployee(employee.id);
      if (!computed) continue;

      const line = await payrollRunRepository.createLine({
        payrollRunId: id,
        employeeId: employee.id,
        grossEarnings: computed.grossEarnings,
        totalDeductions: computed.totalDeductions,
        netPay: computed.netPay,
      });

      const componentRows = computed.components.map((c) => ({
        payrollRunLineId: line.id,
        componentType: c.componentType,
        name: c.name,
        amount: Number(c.value),
        isEarning: c.isEarning,
      }));
      if (computed.totalDeductions - computed.statutoryTotal - computed.otherDeductions > 0) {
        componentRows.push({ payrollRunLineId: line.id, componentType: 'RECOVERY', name: 'Advance/Loan Recovery', amount: computed.totalDeductions - computed.statutoryTotal - computed.otherDeductions, isEarning: false });
      }
      await payrollRunRepository.createLineComponents(componentRows);
    }

    const updated = await payrollRunRepository.update(id, { status: 'CALCULATED', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'PayrollRun', entityId: id, description: `Calculated payroll run ${existing.runNumber} for ${employees.filter(Boolean).length} employee(s)` });
    return payrollRunService.getById(updated.id);
  },

  async verify(id: string, actorId: string) {
    const existing = await payrollRunRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Payroll Run not found', 404);
    if (existing.status !== 'CALCULATED') throw new AppError('Only a calculated payroll run can be verified', 409);

    await payrollRunRepository.update(id, { status: 'VERIFIED', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'PayrollRun', entityId: id, description: `Verified payroll run ${existing.runNumber}` });
    return payrollRunService.getById(id);
  },

  /** Approves the period's calculated payslips for disbursement — salary expense recognition was a pure ledger concept and has been dropped along with the accounting engine; the actual cash movement happens per-line in pay() below. */
  async approve(id: string, actorId: string) {
    const existing = await payrollRunRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Payroll Run not found', 404);
    if (existing.status !== 'VERIFIED') throw new AppError('Only a verified payroll run can be approved', 409);

    const run = await payrollRunRepository.findById(id);
    if (!run || run.lines.length === 0) throw new AppError('This payroll run has no calculated lines to approve', 409);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    await payrollRunRepository.update(id, {
      status: 'APPROVED',
      approvedById: actorId,
      organizationId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'PayrollRun', entityId: id, description: `Approved payroll run ${existing.runNumber} (${run.lines.length} employees)` });
    return payrollRunService.getById(id);
  },

  /** Disburses each line's net pay via its own Payment Voucher and closes out the recovered advances/loan installments (design doc §5.6). */
  async process(id: string, actorId: string) {
    const existing = await payrollRunRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Payroll Run not found', 404);
    if (existing.status !== 'APPROVED') throw new AppError('Only an approved payroll run can be processed', 409);

    await payrollRunRepository.update(id, { status: 'PROCESSED', processedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'PayrollRun', entityId: id, description: `Marked payroll run ${existing.runNumber} as processed — ready for disbursement` });
    return payrollRunService.getById(id);
  },

  /** Disburses each line's net pay by debiting the fund account directly and closes out the recovered advances/loan installments (design doc §5.6). */
  async pay(id: string, actorId: string) {
    const existing = await payrollRunRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Payroll Run not found', 404);
    if (existing.status !== 'PROCESSED') throw new AppError('Only a processed payroll run can be paid', 409);

    const run = await payrollRunRepository.findById(id);
    if (!run) throw new AppError('Payroll Run not found', 404);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, undefined, undefined);
    if (!fundAccount.isActive) throw new AppError('The default Bank/Cash account is inactive', 409);

    for (const line of run.lines) {
      if (Number(line.netPay) <= 0) continue;

      await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -Number(line.netPay));

      const computed = await computeLineForEmployee(line.employee.id);
      await payrollRunRepository.updateLine(line.id, { fundAccountType: fundAccount.type, fundAccountId: fundAccount.id });

      if (computed) {
        await Promise.all([
          ...(computed.settledAdvanceIds.length ? [employeeAdvanceRepository.markSettled(computed.settledAdvanceIds, line.id)] : []),
          ...computed.settledInstallmentIds.map((instId) => employeeLoanRepository.markInstallmentRecovered(instId, line.id)),
        ]);
      }
    }

    const updated = await payrollRunRepository.update(id, { status: 'PAID', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'PayrollRun', entityId: id, description: `Paid payroll run ${existing.runNumber} — paid from ${fundAccount.label}` });
    return payrollRunService.getById(updated.id);
  },

  async cancel(id: string, actorId: string) {
    const existing = await payrollRunRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Payroll Run not found', 404);
    if (existing.status === 'PAID') throw new AppError('Cannot cancel a payroll run that has already been paid', 409);

    await payrollRunRepository.update(id, { status: 'CANCELLED', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'PayrollRun', entityId: id, description: `Cancelled payroll run ${existing.runNumber}` });
    return payrollRunService.getById(id);
  },

  async revertToDraft(id: string, actorId: string) {
    const existing = await payrollRunRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Payroll Run not found', 404);
    if (existing.status === 'APPROVED' || existing.status === 'PROCESSED' || existing.status === 'PAID') {
      throw new AppError('Cannot revert a payroll run once it has been approved', 409);
    }

    await payrollRunRepository.update(id, { status: 'DRAFT', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'PayrollRun', entityId: id, description: `Reverted payroll run ${existing.runNumber} to draft` });
    return payrollRunService.getById(id);
  },
};
