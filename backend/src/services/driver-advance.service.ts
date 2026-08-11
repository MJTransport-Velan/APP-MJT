import { Request } from 'express';
import { driverAdvanceRepository, DriverAdvanceWithRelations } from '../repositories/driver-advance.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateDriverAdvanceInput } from '../validators/driver-advance.validator';

function serialize(advance: DriverAdvanceWithRelations) {
  return {
    id: advance.id,
    advanceNumber: advance.advanceNumber,
    advanceType: advance.advanceType,
    purpose: advance.purpose,
    amount: advance.amount,
    approvalStatus: advance.approvalStatus,
    isSettled: advance.isSettled,
    settlementId: advance.settlementId,
    driver: { id: advance.driver.id, name: advance.driver.name, code: advance.driver.code },
    trip: advance.trip ? { id: advance.trip.id, tripNumber: advance.trip.tripNumber } : null,
    vehicle: advance.vehicle ? { id: advance.vehicle.id, registrationNumber: advance.vehicle.registrationNumber } : null,
    paymentMode: advance.paymentMode ? { id: advance.paymentMode.id, name: advance.paymentMode.name } : null,
    createdAt: advance.createdAt,
    updatedAt: advance.updatedAt,
  };
}

export const driverAdvanceService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await driverAdvanceRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      driverId: (query.driverId as string) || undefined,
      approvalStatus: (query.approvalStatus as never) || undefined,
      isSettled: query.isSettled === 'true' ? true : query.isSettled === 'false' ? false : undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const advance = await driverAdvanceRepository.findById(id);
    if (!advance) throw new AppError('Driver Advance not found', 404);
    return serialize(advance);
  },

  /** Records the request only — no money moves until a business approval calls approve(). */
  async request(input: CreateDriverAdvanceInput, actorId: string) {
    const driver = await driverAdvanceRepository.findDriverById(input.driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    if (!driver.isActive) throw new AppError('Cannot record an advance for an inactive driver', 409);

    const advanceNumber = await driverAdvanceRepository.nextAdvanceNumber();
    const advance = await driverAdvanceRepository.create({
      advanceNumber,
      driverId: input.driverId,
      tripId: input.tripId,
      vehicleId: input.vehicleId,
      advanceType: input.advanceType,
      purpose: input.purpose,
      amount: input.amount,
      paymentModeId: input.paymentModeId,
      fundAccountType: input.fundAccountType,
      fundAccountId: input.fundAccountId,
      requestedById: actorId,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'DriverAdvance',
      entityId: advance.id,
      description: `Requested driver advance ${advance.advanceNumber} (${advance.advanceType}) for ${driver.name}`,
    });

    return driverAdvanceService.getById(advance.id);
  },

  /** Approving hands over the money — resolves the fund account and directly debits its currentBalance. */
  async approve(id: string, actorId: string) {
    const existing = await driverAdvanceRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Advance not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Advance has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    const driver = await driverAdvanceRepository.findDriverById(existing.driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, existing.fundAccountType ?? undefined, existing.fundAccountId ?? undefined);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -Number(existing.amount));

    const updated = await driverAdvanceRepository.update(id, {
      approvalStatus: 'APPROVED',
      approvedById: actorId,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      organizationId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'DriverAdvance',
      entityId: id,
      description: `Approved driver advance ${existing.advanceNumber} — paid from ${fundAccount.label}`,
    });

    return driverAdvanceService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await driverAdvanceRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Advance not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Advance has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    await driverAdvanceRepository.update(id, { approvalStatus: 'REJECTED', approvedById: actorId, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'DriverAdvance',
      entityId: id,
      description: `Rejected driver advance ${existing.advanceNumber}${reason ? `: ${reason}` : ''}`,
    });

    return driverAdvanceService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await driverAdvanceRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Advance not found', 404);
    if (existing.approvalStatus === 'APPROVED') throw new AppError('Cannot delete an approved advance that already paid out', 409);

    await driverAdvanceRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'DriverAdvance', entityId: id, description: `Deleted driver advance ${existing.advanceNumber}` });
  },
};
