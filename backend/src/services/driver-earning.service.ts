import { Request } from 'express';
import { DriverEarningWithRelations, driverEarningRepository } from '../repositories/driver-earning.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateDriverEarningInput, CreateDriverEarningRuleInput, UpdateDriverEarningRuleInput } from '../validators/driver-earning.validator';

function serialize(e: DriverEarningWithRelations) {
  return {
    id: e.id,
    earningNumber: e.earningNumber,
    earningCategory: e.earningCategory,
    earningType: e.earningType,
    name: e.name,
    amount: e.amount,
    approvalStatus: e.approvalStatus,
    isSettled: e.isSettled,
    settlementId: e.settlementId,
    driver: { id: e.driver.id, name: e.driver.name, code: e.driver.code },
    trip: e.trip ? { id: e.trip.id, tripNumber: e.trip.tripNumber } : null,
    rule: e.rule ? { id: e.rule.id, calculationType: e.rule.calculationType, value: e.rule.value } : null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export const driverEarningService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await driverEarningRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      driverId: (query.driverId as string) || undefined,
      earningCategory: (query.earningCategory as never) || undefined,
      approvalStatus: (query.approvalStatus as never) || undefined,
      isSettled: query.isSettled === 'true' ? true : query.isSettled === 'false' ? false : undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const e = await driverEarningRepository.findById(id);
    if (!e) throw new AppError('Driver Earning not found', 404);
    return serialize(e);
  },

  /** Allowances/incentives default to APPROVED; set requiresApproval to gate a discretionary bonus first. The earning accrues against the driver's own record — it is settled/paid out later via driver-settlement.service.ts. */
  async create(input: CreateDriverEarningInput, actorId: string) {
    const driver = await driverEarningRepository.findDriverById(input.driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    if (!driver.isActive) throw new AppError('Cannot record an earning for an inactive driver', 409);

    let amount = input.amount;
    if (!amount && input.ruleId) {
      const rule = await driverEarningRepository.findRuleById(input.ruleId);
      if (!rule) throw new AppError('Earning rule not found', 404);
      amount = Number(rule.value);
    }
    if (!amount || amount <= 0) throw new AppError('amount is required (or a rule with a value)', 422);

    const earningNumber = await driverEarningRepository.nextEarningNumber();
    const earning = await driverEarningRepository.create({
      earningNumber,
      driverId: input.driverId,
      tripId: input.tripId,
      earningCategory: input.earningCategory,
      earningType: input.earningType,
      name: input.name,
      amount,
      ruleId: input.ruleId,
      approvalStatus: input.requiresApproval ? 'PENDING' : 'APPROVED',
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'DriverEarning',
      entityId: earning.id,
      description: `Recorded driver ${earning.earningCategory.toLowerCase()} ${earning.earningNumber} (${earning.earningType}) for ${driver.name}`,
    });

    return driverEarningService.getById(earning.id);
  },

  async approve(id: string, actorId: string) {
    const existing = await driverEarningRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Earning not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Earning has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    await driverEarningRepository.update(id, { approvalStatus: 'APPROVED', approvedById: actorId, updatedById: actorId });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverEarning', entityId: id, description: `Approved driver earning ${existing.earningNumber}` });
    return driverEarningService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await driverEarningRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Earning not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Earning has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    await driverEarningRepository.update(id, { approvalStatus: 'REJECTED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverEarning', entityId: id, description: `Rejected driver earning ${existing.earningNumber}${reason ? `: ${reason}` : ''}` });
    return driverEarningService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await driverEarningRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Earning not found', 404);
    if (existing.approvalStatus === 'APPROVED') throw new AppError('Cannot delete an earning that has already been approved', 409);

    await driverEarningRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'DriverEarning', entityId: id, description: `Deleted driver earning ${existing.earningNumber}` });
  },

  // --- Rate card (DriverEarningRule) ---
  async listRules() {
    return driverEarningRepository.listRules();
  },

  async createRule(input: CreateDriverEarningRuleInput, actorId: string) {
    const rule = await driverEarningRepository.createRule({
      earningCategory: input.earningCategory,
      earningType: input.earningType,
      calculationType: input.calculationType,
      value: input.value,
      vehicleTypeId: input.vehicleTypeId,
      routeId: input.routeId,
      createdById: actorId,
      updatedById: actorId,
    });
    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'DriverEarningRule', entityId: rule.id, description: `Created driver earning rule for ${rule.earningType}` });
    return rule;
  },

  async updateRule(id: string, input: UpdateDriverEarningRuleInput, actorId: string) {
    const rule = await driverEarningRepository.updateRule(id, { ...input, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverEarningRule', entityId: id, description: `Updated driver earning rule for ${rule.earningType}` });
    return rule;
  },

  async removeRule(id: string, actorId: string) {
    await driverEarningRepository.softDeleteRule(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'DriverEarningRule', entityId: id, description: 'Deleted driver earning rule' });
  },
};
