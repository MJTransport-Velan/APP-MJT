import { Request } from 'express';
import { employeeAdvanceRepository, EmployeeAdvanceWithRelations } from '../repositories/employee-advance.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateEmployeeAdvanceInput } from '../validators/employee-advance.validator';

function serialize(a: EmployeeAdvanceWithRelations) {
  return {
    id: a.id,
    advanceNumber: a.advanceNumber,
    advanceType: a.advanceType,
    purpose: a.purpose,
    amount: a.amount,
    approvalStatus: a.approvalStatus,
    isSettled: a.isSettled,
    employee: { id: a.employee.id, name: a.employee.name, employeeCode: a.employee.employeeCode },
    paymentMode: a.paymentMode ? { id: a.paymentMode.id, name: a.paymentMode.name } : null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export const employeeAdvanceService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await employeeAdvanceRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      employeeId: (query.employeeId as string) || undefined,
      approvalStatus: (query.approvalStatus as never) || undefined,
      isSettled: query.isSettled === 'true' ? true : query.isSettled === 'false' ? false : undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const a = await employeeAdvanceRepository.findById(id);
    if (!a) throw new AppError('Employee Advance not found', 404);
    return serialize(a);
  },

  async request(input: CreateEmployeeAdvanceInput, actorId: string) {
    const employee = await employeeAdvanceRepository.findEmployeeById(input.employeeId);
    if (!employee) throw new AppError('Employee not found', 404);
    if (!employee.isActive) throw new AppError('Cannot record an advance for an inactive employee', 409);

    const advanceNumber = await employeeAdvanceRepository.nextAdvanceNumber();
    const advance = await employeeAdvanceRepository.create({
      advanceNumber,
      employeeId: input.employeeId,
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

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'EmployeeAdvance', entityId: advance.id, description: `Requested employee advance ${advance.advanceNumber} (${advance.advanceType}) for ${employee.name}` });
    return employeeAdvanceService.getById(advance.id);
  },

  /** Approving hands over the money — resolves the fund account and directly debits its currentBalance. */
  async approve(id: string, actorId: string) {
    const existing = await employeeAdvanceRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Employee Advance not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Advance has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    const employee = await employeeAdvanceRepository.findEmployeeById(existing.employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, existing.fundAccountType ?? undefined, existing.fundAccountId ?? undefined);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -Number(existing.amount));

    await employeeAdvanceRepository.update(id, {
      approvalStatus: 'APPROVED',
      approvedById: actorId,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      organizationId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'EmployeeAdvance', entityId: id, description: `Approved employee advance ${existing.advanceNumber} — paid from ${fundAccount.label}` });
    return employeeAdvanceService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await employeeAdvanceRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Employee Advance not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Advance has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    await employeeAdvanceRepository.update(id, { approvalStatus: 'REJECTED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'EmployeeAdvance', entityId: id, description: `Rejected employee advance ${existing.advanceNumber}${reason ? `: ${reason}` : ''}` });
    return employeeAdvanceService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await employeeAdvanceRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Employee Advance not found', 404);
    if (existing.approvalStatus === 'APPROVED') throw new AppError('Cannot delete an approved advance that already paid out', 409);

    await employeeAdvanceRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'EmployeeAdvance', entityId: id, description: `Deleted employee advance ${existing.advanceNumber}` });
  },
};
