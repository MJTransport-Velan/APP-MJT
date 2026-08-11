import { Request } from 'express';
import { bankTransferRepository } from '../repositories/bank-transfer.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { resolveFundAccount, assertFundAccountsDiffer, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { prisma } from '../config/db';
import { CreateBankTransferInput } from '../validators/bank-transfer.validator';

export const bankTransferService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const organizationId = await organizationService.resolveOrganizationId(query.organizationId as string | undefined);
    const { rows, total } = await bankTransferRepository.findManyPaginated({
      organizationId,
      skip,
      take,
      search: (query.search as string) || undefined,
    });
    return { data: rows, meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const transfer = await bankTransferRepository.findById(id);
    if (!transfer) throw new AppError('Bank Transfer not found', 404);
    return transfer;
  },

  /** Every transfer directly debits the "from" account and credits the "to" account (minus any transfer charges, which come off the "from" side too) — no voucher/ledger involved. */
  async create(input: CreateBankTransferInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);

    await assertFundAccountsDiffer(input.fromAccountType, input.fromAccountId, input.toAccountType, input.toAccountId);
    const fromAccount = await resolveFundAccount(organizationId, input.fromAccountType, input.fromAccountId);
    const toAccount = await resolveFundAccount(organizationId, input.toAccountType, input.toAccountId);
    if (!fromAccount.isActive) throw new AppError(`The "From" account is inactive`, 409);
    if (!toAccount.isActive) throw new AppError(`The "To" account is inactive`, 409);

    const charges = input.transferCharges ?? 0;

    if (input.paymentModeId) {
      const mode = await prisma.paymentMode.findFirst({ where: { id: input.paymentModeId, deletedAt: null } });
      if (!mode || !mode.isActive) throw new AppError('Payment Mode not found or inactive', 422);
    }

    const transferNumber = await bankTransferRepository.nextTransferNumber(organizationId);

    const transfer = await bankTransferRepository.create({
      organizationId,
      transferNumber,
      transferDate: new Date(`${input.transferDate}T00:00:00.000Z`),
      fromAccountType: input.fromAccountType,
      fromAccountId: input.fromAccountId,
      toAccountType: input.toAccountType,
      toAccountId: input.toAccountId,
      amount: input.amount,
      transferCharges: charges,
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      narration: input.narration,
      createdById: actorId,
      updatedById: actorId,
    });

    await adjustFundAccountBalance(fromAccount.type, fromAccount.id, -(input.amount + charges));
    await adjustFundAccountBalance(toAccount.type, toAccount.id, input.amount);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'BankTransfer',
      entityId: transfer.id,
      description: `Created bank transfer ${transfer.transferNumber} (${fromAccount.label} → ${toAccount.label})`,
    });

    return bankTransferRepository.findById(transfer.id);
  },
};
