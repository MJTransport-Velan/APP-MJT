import { Request } from 'express';
import { driverSettlementRepository, DriverSettlementWithRelations } from '../repositories/driver-settlement.repository';
import { AppError } from '../middlewares/error.middleware';
import { hardDelete } from '../utils/hardDelete.util';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateDriverSettlementInput } from '../validators/driver-settlement.validator';
import { driverSalaryStructureService } from './driver-salary-structure.service';

function serialize(s: DriverSettlementWithRelations) {
  return {
    id: s.id,
    settlementNumber: s.settlementNumber,
    settlementType: s.settlementType,
    periodStart: s.periodStart,
    periodEnd: s.periodEnd,
    status: s.status,
    grossEarnings: s.grossEarnings,
    totalDeductions: s.totalDeductions,
    netPayable: s.netPayable,
    driver: { id: s.driver.id, name: s.driver.name, code: s.driver.code },
    lines: s.lines.map((l) => ({ id: l.id, sourceType: l.sourceType, sourceId: l.sourceId, description: l.description, amount: l.amount, direction: l.direction })),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

/**
 * Every Advance/Earning/Penalty already posts its own Voucher against the
 * Driver Ledger at approval time — the ledger is always live, per §1's "no
 * stored balance" discipline. Settlement's job is therefore not to
 * re-recognize those postings (no separate Journal Voucher is needed,
 * unlike a driver who also draws a formal salary, which this
 * implementation routes through Employee Payroll instead — see design doc
 * §14 on keeping the two tracks separate) — it is to sweep the period's
 * contributing documents into one net cash movement and close them out as
 * settled.
 */
async function computeDraft(driverId: string, periodStart: Date, periodEnd: Date) {
  const [advances, earnings, penalties, salary] = await Promise.all([
    driverSettlementRepository.findUnsettledAdvances(driverId, periodStart, periodEnd),
    driverSettlementRepository.findUnsettledEarnings(driverId, periodStart, periodEnd),
    driverSettlementRepository.findUnsettledPenalties(driverId, periodStart, periodEnd),
    driverSalaryStructureService.computeForPeriod(driverId, periodStart, periodEnd),
  ]);

  const lines: { sourceType: 'ADVANCE' | 'ALLOWANCE' | 'INCENTIVE' | 'PENALTY' | 'SALARY'; sourceId?: string; description: string; amount: number; direction: 'DEBIT' | 'CREDIT' }[] = [];

  // Base pay per the driver's active salary structure (Fixed or % of
  // freight) — not tied to a persisted document, so it has no sourceId and
  // is simply recomputed fresh every time this period is calculated.
  if (salary && salary.amount > 0) {
    lines.push({ sourceType: 'SALARY', description: salary.description, amount: salary.amount, direction: 'CREDIT' });
  }

  for (const a of advances) lines.push({ sourceType: 'ADVANCE', sourceId: a.id, description: `Advance ${a.advanceNumber} (${a.advanceType})`, amount: Number(a.amount), direction: 'DEBIT' });
  for (const e of earnings)
    lines.push({
      sourceType: e.earningCategory === 'INCENTIVE' ? 'INCENTIVE' : 'ALLOWANCE',
      sourceId: e.id,
      description: `${e.earningType} (${e.earningNumber})`,
      amount: Number(e.amount),
      direction: 'CREDIT',
    });
  for (const p of penalties) lines.push({ sourceType: 'PENALTY', sourceId: p.id, description: `Penalty ${p.penaltyNumber} (${p.penaltyType})`, amount: Number(p.amount), direction: 'DEBIT' });

  const grossEarnings = lines.filter((l) => l.direction === 'CREDIT').reduce((sum, l) => sum + l.amount, 0);
  const totalDeductions = lines.filter((l) => l.direction === 'DEBIT').reduce((sum, l) => sum + l.amount, 0);
  const netPayable = Math.round((grossEarnings - totalDeductions) * 100) / 100;

  return { lines, grossEarnings, totalDeductions, netPayable, advances, earnings, penalties };
}

export const driverSettlementService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await driverSettlementRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      driverId: (query.driverId as string) || undefined,
      status: (query.status as never) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const s = await driverSettlementRepository.findById(id);
    if (!s) throw new AppError('Driver Settlement not found', 404);
    return serialize(s);
  },

  /** Computes the breakdown without creating or touching any settlement row — the "Generate Settlement" preview step (design doc §15). */
  async preview(driverId: string, periodStart: string, periodEnd: string) {
    const driver = await driverSettlementRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    const draft = await computeDraft(driverId, new Date(periodStart), new Date(`${periodEnd}T23:59:59.999Z`));
    return { grossEarnings: draft.grossEarnings, totalDeductions: draft.totalDeductions, netPayable: draft.netPayable, lines: draft.lines };
  },

  async create(input: CreateDriverSettlementInput, actorId: string) {
    const driver = await driverSettlementRepository.findDriverById(input.driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const settlementNumber = await driverSettlementRepository.nextSettlementNumber();
    const settlement = await driverSettlementRepository.create({
      settlementNumber,
      driverId: input.driverId,
      settlementType: input.settlementType ?? 'PARTIAL',
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(`${input.periodEnd}T23:59:59.999Z`),
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'DriverSettlement', entityId: settlement.id, description: `Created driver settlement ${settlement.settlementNumber} for ${driver.name}` });
    return driverSettlementService.getById(settlement.id);
  },

  /** Recomputable while DRAFT/CALCULATED — reverting to DRAFT first is required once APPROVED (design doc §8 Settlement Rules). */
  async calculate(id: string, actorId: string) {
    const existing = await driverSettlementRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Settlement not found', 404);
    if (existing.status === 'PAID') throw new AppError('Cannot recalculate a settlement that has already been paid', 409);

    const draft = await computeDraft(existing.driverId, existing.periodStart, existing.periodEnd);

    await driverSettlementRepository.deleteLines(id);
    await driverSettlementRepository.createLines(draft.lines.map((l) => ({ settlementId: id, sourceType: l.sourceType, sourceId: l.sourceId, description: l.description, amount: l.amount, direction: l.direction })));

    const updated = await driverSettlementRepository.update(id, {
      status: 'CALCULATED',
      grossEarnings: draft.grossEarnings,
      totalDeductions: draft.totalDeductions,
      netPayable: draft.netPayable,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverSettlement', entityId: id, description: `Calculated driver settlement ${existing.settlementNumber} — Net Payable ${updated.netPayable}` });
    return driverSettlementService.getById(id);
  },

  async approve(id: string, actorId: string) {
    const existing = await driverSettlementRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Settlement not found', 404);
    if (existing.status !== 'CALCULATED') throw new AppError('Only a calculated settlement can be approved', 409);

    await driverSettlementRepository.update(id, { status: 'APPROVED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverSettlement', entityId: id, description: `Approved driver settlement ${existing.settlementNumber}` });
    return driverSettlementService.getById(id);
  },

  /** Moves the single net cash amount (paid out if net payable, recovered if net recoverable) and closes out every contributing document (design doc §12). */
  async pay(id: string, actorId: string) {
    const existing = await driverSettlementRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Settlement not found', 404);
    if (existing.status !== 'APPROVED') throw new AppError('Only an approved settlement can be paid', 409);

    const driver = await driverSettlementRepository.findDriverById(existing.driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const draft = await computeDraft(existing.driverId, existing.periodStart, existing.periodEnd);
    const netPayable = Number(existing.netPayable);

    if (netPayable !== 0) {
      const fundAccount = await resolveOrDefaultFundAccount(organizationId, undefined, undefined);
      if (!fundAccount.isActive) throw new AppError('The default Bank/Cash account is inactive', 409);

      // Paying the driver (netPayable > 0) draws money out of the fund account;
      // recovering from the driver (netPayable < 0) puts money back in.
      await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -netPayable);
    }

    await Promise.all([
      driverSettlementRepository.markAdvancesSettled(draft.advances.map((a) => a.id), id),
      driverSettlementRepository.markEarningsSettled(draft.earnings.map((e) => e.id), id),
      driverSettlementRepository.markPenaltiesSettled(draft.penalties.map((p) => p.id), id),
    ]);

    await driverSettlementRepository.update(id, {
      status: 'PAID',
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverSettlement', entityId: id, description: `Paid driver settlement ${existing.settlementNumber} for ${driver.name} — Net ${netPayable}` });
    return driverSettlementService.getById(id);
  },

  async revertToDraft(id: string, actorId: string) {
    const existing = await driverSettlementRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Settlement not found', 404);
    if (existing.status === 'PAID') throw new AppError('Cannot revert a settlement that has already been paid', 409);

    await driverSettlementRepository.update(id, { status: 'DRAFT', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverSettlement', entityId: id, description: `Reverted driver settlement ${existing.settlementNumber} to draft` });
    return driverSettlementService.getById(id);
  },

  /**
   * Deletes a settlement that has not paid out. Its lines go with it, and the
   * advances, earnings and penalties it had claimed are released back to
   * unsettled so a corrected settlement can pick them up again. A PAID
   * settlement has already moved money and is reverted, not deleted.
   */
  async remove(id: string, actorId: string) {
    const existing = await driverSettlementRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Settlement not found', 404);
    if (existing.status === 'PAID') {
      throw new AppError('This settlement has already been paid, so it cannot be deleted. Revert it to draft first.', 409);
    }

    await driverSettlementRepository.deleteLines(id);
    await driverSettlementRepository.releaseClaimedItems(id);
    await hardDelete('Driver Settlement', () => driverSettlementRepository.hardDelete(id));

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'DriverSettlement',
      entityId: id,
      description: `Deleted driver settlement ${existing.settlementNumber}`,
    });
  },
};
