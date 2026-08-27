import { Request } from 'express';
import { bankAccountRepository } from '../repositories/bank-account.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateBankAccountInput, UpdateBankAccountInput } from '../validators/bank-account.validator';
import { hardDelete } from '../utils/hardDelete.util';
import { assertFundAccountUnreferenced } from '../utils/fundAccount.util';

export const bankAccountService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const organizationId = await organizationService.resolveOrganizationId(query.organizationId as string | undefined);
    const { rows, total } = await bankAccountRepository.findManyPaginated({
      organizationId,
      skip,
      take,
      search: (query.search as string) || undefined,
      isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
    });
    return { data: rows, meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const account = await bankAccountRepository.findById(id);
    if (!account) throw new AppError('Bank Account not found', 404);
    return account;
  },

  async create(input: CreateBankAccountInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);

    const dup = await bankAccountRepository.findByAccountNumber(organizationId, input.accountNumber);
    if (dup) throw new AppError('Bank Account number already registered for this organization', 409);

    const openingBalance = input.openingBalance ?? 0;

    const account = await bankAccountRepository.create({
      organizationId,
      accountHolderName: input.accountHolderName,
      accountNumber: input.accountNumber,
      bankName: input.bankName,
      accountType: input.accountType ?? 'CURRENT',
      ifscCode: input.ifscCode,
      micrCode: input.micrCode,
      swiftCode: input.swiftCode,
      branchName: input.branchName,
      openingBalance,
      currentBalance: openingBalance,
      openingDate: input.openingDate ? new Date(input.openingDate) : undefined,
      isPrimary: input.isPrimary ?? false,
      isDefaultPaymentAccount: input.isDefaultPaymentAccount ?? false,
      isDefaultReceiptAccount: input.isDefaultReceiptAccount ?? false,
      createdById: actorId,
      updatedById: actorId,
    });

    if (account.isPrimary) {
      await bankAccountRepository.clearOtherPrimaries(organizationId, account.id);
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'BankAccount',
      entityId: account.id,
      description: `Created bank account ${account.accountHolderName} (${account.accountNumber})`,
    });

    return account;
  },

  async update(id: string, input: UpdateBankAccountInput, actorId: string) {
    const existing = await bankAccountRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Bank Account not found', 404);

    if (input.accountNumber && input.accountNumber !== existing.accountNumber) {
      const dup = await bankAccountRepository.findByAccountNumber(existing.organizationId, input.accountNumber);
      if (dup) throw new AppError('Bank Account number already registered for this organization', 409);
    }

    if (input.isPrimary) {
      await bankAccountRepository.clearOtherPrimaries(existing.organizationId, id);
    }

    const updated = await bankAccountRepository.update(id, {
      accountHolderName: input.accountHolderName,
      accountNumber: input.accountNumber,
      bankName: input.bankName,
      accountType: input.accountType,
      ifscCode: input.ifscCode,
      micrCode: input.micrCode,
      swiftCode: input.swiftCode,
      branchName: input.branchName,
      isPrimary: input.isPrimary,
      isDefaultPaymentAccount: input.isDefaultPaymentAccount,
      isDefaultReceiptAccount: input.isDefaultReceiptAccount,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'BankAccount',
      entityId: id,
      description: `Updated bank account ${existing.accountHolderName}`,
    });

    return updated;
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await bankAccountRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Bank Account not found', 404);

    if (existing.isActive) {
      const nonTerminalCheques = await bankAccountRepository.countNonTerminalCheques(id);
      if (nonTerminalCheques > 0) {
        throw new AppError('Cannot deactivate — this account has cheques in progress (issued/received/deposited/presented)', 409);
      }
    }

    const updated = await bankAccountRepository.update(id, { isActive: !existing.isActive, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'BankAccount',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} bank account ${existing.accountHolderName}`,
    });

    return updated;
  },

  /**
   * Removes the account outright. Anything that ever moved money through it
   * blocks the delete — the balances on those receipts, transfers and cheques
   * are only meaningful while the account they name still exists.
   */
  async remove(id: string, actorId: string) {
    const existing = await bankAccountRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Bank Account not found', 404);

    await assertFundAccountUnreferenced('BANK', id);

    await hardDelete(
      'Bank Account',
      () => bankAccountRepository.hardDelete(id),
      'This account still has cheque books or cheques recorded against it, so it cannot be deleted. Delete those first, or deactivate the account instead.'
    );

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'BankAccount',
      entityId: id,
      description: `Deleted bank account ${existing.accountHolderName} (${existing.accountNumber})`,
    });
  },
};
