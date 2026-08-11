import { Request } from 'express';
import { driverPenaltyRepository, DriverPenaltyWithRelations } from '../repositories/driver-penalty.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateDriverPenaltyInput } from '../validators/driver-penalty.validator';

function serialize(p: DriverPenaltyWithRelations) {
  return {
    id: p.id,
    penaltyNumber: p.penaltyNumber,
    penaltyType: p.penaltyType,
    amount: p.amount,
    reason: p.reason,
    approvalStatus: p.approvalStatus,
    isSettled: p.isSettled,
    settlementId: p.settlementId,
    driver: { id: p.driver.id, name: p.driver.name, code: p.driver.code },
    trip: p.trip ? { id: p.trip.id, tripNumber: p.trip.tripNumber } : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const driverPenaltyService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await driverPenaltyRepository.findManyPaginated({
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
    const p = await driverPenaltyRepository.findById(id);
    if (!p) throw new AppError('Driver Penalty not found', 404);
    return serialize(p);
  },

  async request(input: CreateDriverPenaltyInput, actorId: string) {
    const driver = await driverPenaltyRepository.findDriverById(input.driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    if (!driver.isActive) throw new AppError('Cannot record a penalty for an inactive driver', 409);

    const penaltyNumber = await driverPenaltyRepository.nextPenaltyNumber();
    const penalty = await driverPenaltyRepository.create({
      penaltyNumber,
      driverId: input.driverId,
      tripId: input.tripId,
      penaltyType: input.penaltyType,
      amount: input.amount,
      reason: input.reason,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'DriverPenalty',
      entityId: penalty.id,
      description: `Recorded driver penalty ${penalty.penaltyNumber} (${penalty.penaltyType}) for ${driver.name}: ${penalty.reason}`,
    });

    return driverPenaltyService.getById(penalty.id);
  },

  /** Approval records the recovery against the driver's own balance — settled/recovered later via driver-settlement.service.ts. */
  async approve(id: string, actorId: string) {
    const existing = await driverPenaltyRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Penalty not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Penalty has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    const driver = await driverPenaltyRepository.findDriverById(existing.driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    await driverPenaltyRepository.update(id, {
      approvalStatus: 'APPROVED',
      approvedById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverPenalty', entityId: id, description: `Approved driver penalty ${existing.penaltyNumber}` });
    return driverPenaltyService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await driverPenaltyRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Penalty not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Penalty has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    await driverPenaltyRepository.update(id, { approvalStatus: 'REJECTED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverPenalty', entityId: id, description: `Rejected driver penalty ${existing.penaltyNumber}${reason ? `: ${reason}` : ''}` });
    return driverPenaltyService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await driverPenaltyRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Penalty not found', 404);
    if (existing.approvalStatus === 'APPROVED') throw new AppError('Cannot delete an approved penalty', 409);

    await driverPenaltyRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'DriverPenalty', entityId: id, description: `Deleted driver penalty ${existing.penaltyNumber}` });
  },
};
