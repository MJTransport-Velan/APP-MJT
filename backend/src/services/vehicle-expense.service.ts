import { Request } from 'express';
import { VehicleExpenseCategory, ApprovalStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { vehicleExpenseRepository, VehicleExpenseWithRelations } from '../repositories/vehicle-expense.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateExpenseInput, UpdateExpenseInput, ApproveExpenseInput } from '../validators/vehicle-expense.validator';

function serialize(expense: VehicleExpenseWithRelations) {
  return {
    id: expense.id,
    category: expense.category,
    amount: expense.amount,
    taxAmount: expense.taxAmount,
    totalAmount: expense.totalAmount,
    expenseDate: expense.expenseDate,
    description: expense.description,
    billDocument: expense.billDocument,
    referenceType: expense.referenceType,
    referenceId: expense.referenceId,
    approvalStatus: expense.approvalStatus,
    vehicle: { id: expense.vehicle.id, registrationNumber: expense.vehicle.registrationNumber },
    paymentMode: expense.paymentMode ? { id: expense.paymentMode.id, name: expense.paymentMode.name } : null,
    trip: expense.trip ? { id: expense.trip.id, tripNumber: expense.trip.tripNumber } : null,
    supplier: expense.supplier ? { id: expense.supplier.id, name: expense.supplier.name } : null,
    gstMaster: expense.gstMaster ? { id: expense.gstMaster.id, name: expense.gstMaster.name, ratePercent: expense.gstMaster.ratePercent } : null,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export const vehicleExpenseService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const vehicleId = (query.vehicleId as string) || undefined;
    const category = (query.category as VehicleExpenseCategory) || undefined;
    const approvalStatus = (query.approvalStatus as ApprovalStatus) || undefined;
    const from = query.from ? new Date(query.from as string) : undefined;
    const to = query.to ? new Date(query.to as string) : undefined;

    const { rows, total } = await vehicleExpenseRepository.findManyPaginated({ skip, take, vehicleId, category, approvalStatus, from, to });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const expense = await vehicleExpenseRepository.findById(id);
    if (!expense) throw new AppError('Expense not found', 404);
    return serialize(expense);
  },

  async create(input: CreateExpenseInput, actorId: string) {
    const vehicle = await vehicleExpenseRepository.findVehicleById(input.vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    const taxAmount = input.taxAmount ?? 0;
    const totalAmount = Number((input.amount + taxAmount).toFixed(2));

    const expense = await vehicleExpenseRepository.create({
      vehicleId: input.vehicleId,
      category: input.category,
      amount: input.amount,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
      description: input.description,
      paymentModeId: input.paymentModeId,
      tripId: input.tripId,
      supplierId: input.supplierId,
      gstMasterId: input.gstMasterId,
      taxAmount,
      totalAmount,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'VehicleExpense',
      entityId: expense.id,
      description: `Recorded ${input.category} expense for vehicle ${vehicle.registrationNumber}`,
    });

    return vehicleExpenseService.getById(expense.id);
  },

  async update(id: string, input: UpdateExpenseInput, actorId: string) {
    const existing = await vehicleExpenseRepository.findById(id);
    if (!existing) throw new AppError('Expense not found', 404);
    if (existing.approvalStatus === 'APPROVED') throw new AppError('Cannot edit an approved expense that has already been paid', 409);

    const amount = input.amount ?? Number(existing.amount);
    const taxAmount = input.taxAmount ?? Number(existing.taxAmount || 0);

    await vehicleExpenseRepository.update(id, {
      category: input.category,
      amount: input.amount,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : undefined,
      description: input.description,
      paymentModeId: input.paymentModeId,
      tripId: input.tripId,
      supplierId: input.supplierId,
      gstMasterId: input.gstMasterId,
      taxAmount: input.taxAmount,
      totalAmount: input.amount !== undefined || input.taxAmount !== undefined ? Number((amount + taxAmount).toFixed(2)) : undefined,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'VehicleExpense',
      entityId: id,
      description: `Updated expense for vehicle ${existing.vehicle.registrationNumber}`,
    });

    return vehicleExpenseService.getById(id);
  },

  /** Business approval settles the expense either against a Supplier (no fund account touched — the vendor's bill just gets marked settled with no ledger to post it to anymore) or directly out of a Bank/Cash fund account (design doc §4/§11). */
  async approve(id: string, input: ApproveExpenseInput, actorId: string) {
    const existing = await vehicleExpenseRepository.findById(id);
    if (!existing) throw new AppError('Expense not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Expense has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const totalAmount = Number(existing.totalAmount || existing.amount);

    if (input.settleVia === 'SUPPLIER') {
      if (!existing.supplierId) throw new AppError('This expense has no vendor set — cannot settle it against a Supplier', 422);
      const supplier = await prisma.supplier.findFirst({ where: { id: existing.supplierId, deletedAt: null } });
      if (!supplier) throw new AppError('Supplier not found', 404);
    } else {
      const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
      if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);
      await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -totalAmount);
    }

    await vehicleExpenseRepository.update(id, {
      approvalStatus: 'APPROVED',
      approvedById: actorId,
      organizationId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleExpense', entityId: id, description: `Approved ${existing.category} expense for vehicle ${existing.vehicle.registrationNumber}` });
    return vehicleExpenseService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await vehicleExpenseRepository.findById(id);
    if (!existing) throw new AppError('Expense not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Expense has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    await vehicleExpenseRepository.update(id, { approvalStatus: 'REJECTED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleExpense', entityId: id, description: `Rejected expense for vehicle ${existing.vehicle.registrationNumber}${reason ? `: ${reason}` : ''}` });
    return vehicleExpenseService.getById(id);
  },

  async setBillDocument(id: string, filePath: string, actorId: string) {
    const existing = await vehicleExpenseRepository.findById(id);
    if (!existing) throw new AppError('Expense not found', 404);

    await vehicleExpenseRepository.update(id, { billDocument: filePath, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'VehicleExpense',
      entityId: id,
      description: `Uploaded bill for expense on vehicle ${existing.vehicle.registrationNumber}`,
    });

    return vehicleExpenseService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await vehicleExpenseRepository.findById(id);
    if (!existing) throw new AppError('Expense not found', 404);
    if (existing.approvalStatus === 'APPROVED') throw new AppError('Cannot delete an approved expense that has already been paid', 409);

    await vehicleExpenseRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'VehicleExpense',
      entityId: id,
      description: `Deleted expense for vehicle ${existing.vehicle.registrationNumber}`,
    });
  },
};

/**
 * Internal helper used by other Fleet services (Fuel, Maintenance) to
 * automatically mirror a cost into the unified VehicleExpense ledger,
 * traceable back to its source record via referenceType/referenceId.
 * Not exposed over HTTP. Mirrored rows go through the exact same
 * approval/posting gate as manually-entered ones — this phase adds no
 * special-case path for them (design doc §6.6).
 */
export const vehicleExpenseInternalService = {
  async logFromSource(params: {
    vehicleId: string;
    category: VehicleExpenseCategory;
    amount: number;
    expenseDate: Date;
    description: string;
    referenceType: string;
    referenceId: string;
    actorId: string;
  }) {
    await vehicleExpenseRepository.create({
      vehicleId: params.vehicleId,
      category: params.category,
      amount: params.amount,
      totalAmount: params.amount,
      expenseDate: params.expenseDate,
      description: params.description,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      createdById: params.actorId,
      updatedById: params.actorId,
    });
  },

  /** Keeps the mirrored VehicleExpense row in sync when its source record (e.g. a FastTagTransaction) is edited. No-ops if the source was never mirrored (e.g. a RECHARGE, which doesn't log an expense). */
  async updateFromSource(params: {
    referenceType: string;
    referenceId: string;
    vehicleId?: string;
    amount?: number;
    expenseDate?: Date;
    description?: string;
    actorId: string;
  }) {
    const existing = await vehicleExpenseRepository.findByReference(params.referenceType, params.referenceId);
    if (!existing) return;
    await vehicleExpenseRepository.update(existing.id, {
      vehicleId: params.vehicleId,
      amount: params.amount,
      totalAmount: params.amount,
      expenseDate: params.expenseDate,
      description: params.description,
      updatedById: params.actorId,
    });
  },

  /** Soft-deletes the mirrored VehicleExpense row when its source record is deleted. No-ops if none was ever mirrored. */
  async removeFromSource(params: { referenceType: string; referenceId: string; actorId: string }) {
    const existing = await vehicleExpenseRepository.findByReference(params.referenceType, params.referenceId);
    if (!existing) return;
    await vehicleExpenseRepository.softDelete(existing.id, params.actorId);
  },
};
