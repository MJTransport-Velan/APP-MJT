import { Request } from 'express';
import { driverReimbursementRepository, DriverReimbursementWithRelations } from '../repositories/driver-reimbursement.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateDriverReimbursementInput } from '../validators/driver-reimbursement.validator';

function serialize(r: DriverReimbursementWithRelations) {
  return {
    id: r.id,
    reimbursementNumber: r.reimbursementNumber,
    category: r.category,
    amount: r.amount,
    expenseDate: r.expenseDate,
    description: r.description,
    receiptDocument: r.receiptDocument,
    approvalStatus: r.approvalStatus,
    isSettled: r.isSettled,
    settlementId: r.settlementId,
    driver: { id: r.driver.id, name: r.driver.name, code: r.driver.code },
    trip: r.trip ? { id: r.trip.id, tripNumber: r.trip.tripNumber } : null,
    vehicle: r.vehicle ? { id: r.vehicle.id, registrationNumber: r.vehicle.registrationNumber } : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const driverReimbursementService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await driverReimbursementRepository.findManyPaginated({
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
    const r = await driverReimbursementRepository.findById(id);
    if (!r) throw new AppError('Driver Expense Reimbursement not found', 404);
    return serialize(r);
  },

  async request(input: CreateDriverReimbursementInput, actorId: string) {
    const driver = await driverReimbursementRepository.findDriverById(input.driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    if (!driver.isActive) throw new AppError('Cannot record a reimbursement for an inactive driver', 409);

    const reimbursementNumber = await driverReimbursementRepository.nextReimbursementNumber();
    const r = await driverReimbursementRepository.create({
      reimbursementNumber,
      driverId: input.driverId,
      tripId: input.tripId,
      vehicleId: input.vehicleId,
      category: input.category,
      amount: input.amount,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : undefined,
      description: input.description,
      receiptDocument: input.receiptDocument,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'DriverExpenseReimbursement',
      entityId: r.id,
      description: `Requested driver reimbursement ${r.reimbursementNumber} (${r.category}) for ${driver.name}`,
    });

    return driverReimbursementService.getById(r.id);
  },

  /** Approval recognizes the claim against the driver's own record — settled/paid out later via driver-settlement.service.ts. */
  async approve(id: string, actorId: string) {
    const existing = await driverReimbursementRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Expense Reimbursement not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Reimbursement has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    const driver = await driverReimbursementRepository.findDriverById(existing.driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    await driverReimbursementRepository.update(id, {
      approvalStatus: 'APPROVED',
      approvedById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'DriverExpenseReimbursement',
      entityId: id,
      description: `Approved driver reimbursement ${existing.reimbursementNumber} for ${driver.name}`,
    });

    return driverReimbursementService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await driverReimbursementRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Expense Reimbursement not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Reimbursement has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    await driverReimbursementRepository.update(id, { approvalStatus: 'REJECTED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DriverExpenseReimbursement', entityId: id, description: `Rejected driver reimbursement ${existing.reimbursementNumber}${reason ? `: ${reason}` : ''}` });
    return driverReimbursementService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await driverReimbursementRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Driver Expense Reimbursement not found', 404);
    if (existing.approvalStatus === 'APPROVED') throw new AppError('Cannot delete an approved reimbursement', 409);

    await driverReimbursementRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'DriverExpenseReimbursement', entityId: id, description: `Deleted driver reimbursement ${existing.reimbursementNumber}` });
  },
};
