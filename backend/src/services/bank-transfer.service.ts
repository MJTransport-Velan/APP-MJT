import { Request } from 'express';
import { bankTransferRepository } from '../repositories/bank-transfer.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { resolveFundAccount, assertFundAccountsDiffer, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { prisma } from '../config/db';
import { CreateBankTransferInput, UpdateBankTransferInput } from '../validators/bank-transfer.validator';
import { hardDelete } from '../utils/hardDelete.util';

/**
 * A transfer touches two accounts, and an edit can move it to two different
 * ones. Applying "undo the old legs" and "apply the new legs" one at a time
 * can dip an account below zero halfway through even when the final position
 * is fine, so the four legs are netted per account and written once.
 */
function nettedDeltas(legs: { type: 'BANK' | 'CASH'; id: string; delta: number }[]) {
  const totals = new Map<string, { type: 'BANK' | 'CASH'; id: string; delta: number }>();
  for (const leg of legs) {
    const key = `${leg.type}:${leg.id}`;
    const current = totals.get(key);
    if (current) current.delta += leg.delta;
    else totals.set(key, { ...leg });
  }
  return [...totals.values()].filter((entry) => entry.delta !== 0);
}

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

  /**
   * Editing a posted transfer rewrites the money it moved: the original legs
   * are backed out and the new ones applied in the same pass.
   */
  async update(id: string, input: UpdateBankTransferInput, actorId: string) {
    const existing = await bankTransferRepository.findById(id);
    if (!existing) throw new AppError('Bank Transfer not found', 404);

    const organizationId = existing.organizationId;
    const fromType = input.fromAccountType ?? (existing.fromAccountType as 'BANK' | 'CASH');
    const fromId = input.fromAccountId ?? existing.fromAccountId;
    const toType = input.toAccountType ?? (existing.toAccountType as 'BANK' | 'CASH');
    const toId = input.toAccountId ?? existing.toAccountId;
    const amount = input.amount ?? Number(existing.amount);
    const charges = input.transferCharges ?? Number(existing.transferCharges ?? 0);

    await assertFundAccountsDiffer(fromType, fromId, toType, toId);
    const fromAccount = await resolveFundAccount(organizationId, fromType, fromId);
    const toAccount = await resolveFundAccount(organizationId, toType, toId);
    if (!fromAccount.isActive) throw new AppError(`The "From" account is inactive`, 409);
    if (!toAccount.isActive) throw new AppError(`The "To" account is inactive`, 409);

    if (input.paymentModeId) {
      const mode = await prisma.paymentMode.findFirst({ where: { id: input.paymentModeId, deletedAt: null } });
      if (!mode || !mode.isActive) throw new AppError('Payment Mode not found or inactive', 422);
    }

    const deltas = nettedDeltas([
      { type: existing.fromAccountType as 'BANK' | 'CASH', id: existing.fromAccountId, delta: Number(existing.amount) + Number(existing.transferCharges ?? 0) },
      { type: existing.toAccountType as 'BANK' | 'CASH', id: existing.toAccountId, delta: -Number(existing.amount) },
      { type: fromType, id: fromId, delta: -(amount + charges) },
      { type: toType, id: toId, delta: amount },
    ]);

    const updated = await bankTransferRepository.update(id, {
      transferDate: input.transferDate ? new Date(`${input.transferDate}T00:00:00.000Z`) : undefined,
      fromAccountType: fromType,
      fromAccountId: fromId,
      toAccountType: toType,
      toAccountId: toId,
      amount,
      transferCharges: charges,
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      narration: input.narration,
      updatedById: actorId,
    });

    for (const entry of deltas) {
      await adjustFundAccountBalance(entry.type, entry.id, entry.delta, { allowNegative: true });
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'BankTransfer',
      entityId: id,
      description: `Updated bank transfer ${existing.transferNumber} (${fromAccount.label} → ${toAccount.label})`,
    });

    return updated;
  },

  /** Deleting a transfer puts the money back where it came from. */
  async remove(id: string, actorId: string) {
    const existing = await bankTransferRepository.findById(id);
    if (!existing) throw new AppError('Bank Transfer not found', 404);

    await hardDelete('Bank Transfer', () => bankTransferRepository.hardDelete(id));

    const deltas = nettedDeltas([
      { type: existing.fromAccountType as 'BANK' | 'CASH', id: existing.fromAccountId, delta: Number(existing.amount) + Number(existing.transferCharges ?? 0) },
      { type: existing.toAccountType as 'BANK' | 'CASH', id: existing.toAccountId, delta: -Number(existing.amount) },
    ]);
    for (const entry of deltas) {
      await adjustFundAccountBalance(entry.type, entry.id, entry.delta, { allowNegative: true });
    }

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'BankTransfer',
      entityId: id,
      description: `Deleted bank transfer ${existing.transferNumber}`,
    });
  },
};
