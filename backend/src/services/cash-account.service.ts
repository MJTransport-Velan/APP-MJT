import { Request } from 'express';
import { cashAccountRepository } from '../repositories/cash-account.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateCashAccountInput, UpdateCashAccountInput } from '../validators/cash-account.validator';

export const cashAccountService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const organizationId = await organizationService.resolveOrganizationId(query.organizationId as string | undefined);
    const { rows, total } = await cashAccountRepository.findManyPaginated({
      organizationId,
      skip,
      take,
      search: (query.search as string) || undefined,
      isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
    });
    return { data: rows, meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const account = await cashAccountRepository.findById(id);
    if (!account) throw new AppError('Cash Account not found', 404);
    return account;
  },

  async create(input: CreateCashAccountInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);

    const openingBalance = input.openingBalance ?? 0;

    const account = await cashAccountRepository.create({
      organizationId,
      cashAccountType: input.cashAccountType ?? 'PETTY',
      responsiblePersonId: input.responsiblePersonId,
      openingBalance,
      currentBalance: openingBalance,
      maximumLimit: input.maximumLimit,
      approvalLimit: input.approvalLimit,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'CashAccount',
      entityId: account.id,
      description: `Created ${account.cashAccountType} cash account`,
    });

    return account;
  },

  async update(id: string, input: UpdateCashAccountInput, actorId: string) {
    const existing = await cashAccountRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Cash Account not found', 404);

    const updated = await cashAccountRepository.update(id, {
      cashAccountType: input.cashAccountType,
      responsiblePersonId: input.responsiblePersonId,
      maximumLimit: input.maximumLimit,
      approvalLimit: input.approvalLimit,
      isActive: input.isActive,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'CashAccount',
      entityId: id,
      description: 'Updated cash account',
    });

    return updated;
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await cashAccountRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Cash Account not found', 404);

    if (existing.isActive) {
      const openRequests = await cashAccountRepository.countOpenRequests(id);
      if (openRequests > 0) {
        throw new AppError('Cannot deactivate — this cash account has pending/approved petty cash requests', 409);
      }
    }

    const updated = await cashAccountRepository.update(id, { isActive: !existing.isActive, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'CashAccount',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} cash account`,
    });

    return updated;
  },
};
