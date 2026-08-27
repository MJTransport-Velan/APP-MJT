import { Request } from 'express';
import { chequeRepository } from '../repositories/cheque.repository';
import { chequeBookRepository } from '../repositories/cheque-book.repository';
import { bankAccountRepository } from '../repositories/bank-account.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { adjustFundAccountBalance } from '../utils/fundAccount.util';
import { hardDelete } from '../utils/hardDelete.util';
import { validateLedgerParty } from '../utils/polymorphicRef.util';
import {
  IssueChequeInput,
  ReceiveChequeInput,
  DepositChequeInput,
  ClearChequeInput,
  BounceChequeInput,
  CancelChequeInput,
  UpdateChequeInput,
} from '../validators/cheque.validator';

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

async function assertBankAccount(organizationId: string, bankAccountId: string) {
  const bankAccount = await bankAccountRepository.findByIdBasic(bankAccountId);
  if (!bankAccount || bankAccount.organizationId !== organizationId) {
    throw new AppError('Bank Account not found for this organization', 422);
  }
  if (!bankAccount.isActive) throw new AppError('Bank Account is inactive', 409);
  return bankAccount;
}

export const chequeService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const organizationId = await organizationService.resolveOrganizationId(query.organizationId as string | undefined);
    const { rows, total } = await chequeRepository.findManyPaginated({
      organizationId,
      skip,
      take,
      search: (query.search as string) || undefined,
      bankAccountId: query.bankAccountId as string | undefined,
      direction: query.direction as string | undefined,
      status: query.status as string | undefined,
    });
    return { data: rows, meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const cheque = await chequeRepository.findById(id);
    if (!cheque) throw new AppError('Cheque not found', 404);
    return cheque;
  },

  /** Cheque Issue — just records the cheque as outstanding. The bank account's balance is untouched until it actually clears. */
  /**
   * A cheque is editable only while it is still in hand — once it has been
   * deposited it is out with the bank, and once cleared or bounced it has
   * already moved money that an edit here would not reverse.
   */
  async update(id: string, input: UpdateChequeInput, actorId: string) {
    const cheque = await chequeRepository.findByIdBasic(id);
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.status !== 'ISSUED' && cheque.status !== 'RECEIVED') {
      throw new AppError(`This cheque is ${cheque.status} and can no longer be edited`, 409);
    }

    if (input.chequeNumber && input.chequeNumber !== cheque.chequeNumber) {
      const dup = await chequeRepository.findByNumber(cheque.bankAccountId, input.chequeNumber, cheque.direction);
      if (dup) throw new AppError('This cheque number has already been used for this bank account', 409);
    }

    if (input.partyType) {
      await validateLedgerParty(input.partyType, input.partyId);
    }

    const updated = await chequeRepository.update(id, {
      chequeNumber: input.chequeNumber,
      chequeDate: input.chequeDate ? toDate(input.chequeDate) : undefined,
      isPostDated: input.isPostDated,
      partyType: input.partyType,
      partyId: input.partyId,
      payeeOrPayerName: input.payeeOrPayerName,
      amount: input.amount,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Cheque',
      entityId: id,
      description: `Updated cheque ${cheque.chequeNumber}`,
    });

    return updated;
  },

  /**
   * Deletes a cheque that never moved money. A cleared or bounced cheque has
   * already changed a bank balance, so it is cancelled or stop-paid instead —
   * deleting it would leave that balance unexplained.
   */
  async remove(id: string, actorId: string) {
    const cheque = await chequeRepository.findByIdBasic(id);
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.status === 'CLEARED' || cheque.status === 'BOUNCED') {
      throw new AppError(`This cheque is ${cheque.status} and has already affected a bank balance, so it cannot be deleted`, 409);
    }

    await hardDelete('Cheque', () => chequeRepository.hardDelete(id));

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Cheque',
      entityId: id,
      description: `Deleted cheque ${cheque.chequeNumber}`,
    });
  },

  async issue(input: IssueChequeInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);
    const bankAccount = await assertBankAccount(organizationId, input.bankAccountId);

    if (input.chequeBookId) {
      const book = await chequeBookRepository.findById(input.chequeBookId);
      if (!book || book.bankAccountId !== bankAccount.id) throw new AppError('Cheque Book does not belong to this Bank Account', 422);
      if (!book.isActive) throw new AppError('Cheque Book is inactive', 409);
    }

    const dup = await chequeRepository.findByNumber(bankAccount.id, input.chequeNumber, 'ISSUED');
    if (dup) throw new AppError('This cheque number has already been used for this bank account', 409);

    if (input.partyType) {
      await validateLedgerParty(input.partyType, input.partyId);
    }

    const cheque = await chequeRepository.create({
      organizationId,
      bankAccountId: bankAccount.id,
      chequeBookId: input.chequeBookId,
      direction: 'ISSUED',
      chequeNumber: input.chequeNumber,
      chequeDate: toDate(input.chequeDate),
      isPostDated: input.isPostDated ?? false,
      partyType: input.partyType,
      partyId: input.partyId,
      payeeOrPayerName: input.payeeOrPayerName,
      amount: input.amount,
      status: 'ISSUED',
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Cheque',
      entityId: cheque.id,
      description: `Issued cheque ${cheque.chequeNumber} for ${input.amount}`,
    });

    return cheque;
  },

  /** Cheque Receive — just records the cheque as in-hand. No balance effect until it is deposited and cleared. */
  async receive(input: ReceiveChequeInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);
    const bankAccount = await assertBankAccount(organizationId, input.bankAccountId);

    const dup = await chequeRepository.findByNumber(bankAccount.id, input.chequeNumber, 'RECEIVED');
    if (dup) throw new AppError('This cheque number has already been recorded as received for this bank account', 409);

    if (input.partyType) {
      await validateLedgerParty(input.partyType, input.partyId);
    }

    const cheque = await chequeRepository.create({
      organizationId,
      bankAccountId: bankAccount.id,
      direction: 'RECEIVED',
      chequeNumber: input.chequeNumber,
      chequeDate: toDate(input.chequeDate),
      isPostDated: input.isPostDated ?? false,
      partyType: input.partyType,
      partyId: input.partyId,
      payeeOrPayerName: input.payeeOrPayerName,
      amount: input.amount,
      status: 'RECEIVED',
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Cheque',
      entityId: cheque.id,
      description: `Recorded received cheque ${cheque.chequeNumber} for ${input.amount}`,
    });

    return cheque;
  },

  /** Deposit — RECEIVED -> DEPOSITED. No balance effect yet; clearance is what moves value. */
  async deposit(id: string, input: DepositChequeInput, actorId: string) {
    const cheque = await chequeRepository.findByIdBasic(id);
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.direction !== 'RECEIVED') throw new AppError('Only a received cheque can be deposited', 409);
    if (cheque.status !== 'RECEIVED') throw new AppError(`Cheque is ${cheque.status}, not RECEIVED`, 409);

    const updated = await chequeRepository.update(id, {
      status: 'DEPOSITED',
      depositedIntoBankAccountId: input.depositedIntoBankAccountId ?? cheque.bankAccountId,
      depositDate: input.depositDate ? toDate(input.depositDate) : new Date(),
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Cheque',
      entityId: id,
      description: `Deposited cheque ${cheque.chequeNumber}`,
    });

    return updated;
  },

  /** Marks a cheque as presented at the bank — the gate before Clear/Bounce. */
  async markPresented(id: string, actorId: string) {
    const cheque = await chequeRepository.findByIdBasic(id);
    if (!cheque) throw new AppError('Cheque not found', 404);

    const validFrom = cheque.direction === 'ISSUED' ? 'ISSUED' : 'DEPOSITED';
    if (cheque.status !== validFrom) throw new AppError(`Cheque is ${cheque.status}, not ${validFrom}`, 409);
    if (cheque.isPostDated && cheque.chequeDate > new Date()) {
      throw new AppError('A post-dated cheque cannot be presented before its cheque date', 422);
    }

    const updated = await chequeRepository.update(id, { status: 'PRESENTED', updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Cheque',
      entityId: id,
      description: `Marked cheque ${cheque.chequeNumber} as presented`,
    });

    return updated;
  },

  /** Clearance — the only point at which a cheque actually moves money: debits an issued cheque's bank account, credits a received cheque's deposited-into bank account. */
  async clear(id: string, input: ClearChequeInput, actorId: string) {
    const cheque = await chequeRepository.findByIdBasic(id);
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.status !== 'PRESENTED') throw new AppError(`Cheque is ${cheque.status}, not PRESENTED`, 409);

    const bankAccount = await bankAccountRepository.findByIdBasic(cheque.bankAccountId);
    if (!bankAccount) throw new AppError('Bank Account not found', 404);

    const clearanceDate = input.clearanceDate ?? new Date().toISOString().slice(0, 10);

    const targetBankAccountId =
      cheque.direction === 'RECEIVED' ? cheque.depositedIntoBankAccountId ?? cheque.bankAccountId : bankAccount.id;
    const targetBankAccount =
      targetBankAccountId === bankAccount.id ? bankAccount : await bankAccountRepository.findByIdBasic(targetBankAccountId);
    if (!targetBankAccount) throw new AppError('Deposited-into Bank Account not found', 404);

    if (cheque.direction === 'ISSUED') {
      await adjustFundAccountBalance('BANK', bankAccount.id, -Number(cheque.amount));
    } else {
      await adjustFundAccountBalance('BANK', targetBankAccount.id, Number(cheque.amount));
    }

    const updated = await chequeRepository.update(id, {
      status: 'CLEARED',
      clearanceDate: toDate(clearanceDate),
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Cheque',
      entityId: id,
      description: `Cleared cheque ${cheque.chequeNumber}`,
    });

    return updated;
  },

  /** Bounce — only from PRESENTED (it never actually cleared, so the bank account balance needs no reversal). An optional bank bounce charge is a real cash outflow, so it does hit the balance. */
  async bounce(id: string, input: BounceChequeInput, actorId: string) {
    const cheque = await chequeRepository.findByIdBasic(id);
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.status !== 'PRESENTED') throw new AppError(`Cheque is ${cheque.status}, not PRESENTED`, 409);

    const bankAccount = await bankAccountRepository.findByIdBasic(cheque.bankAccountId);
    if (!bankAccount) throw new AppError('Bank Account not found', 404);

    if (input.bounceChargeAmount) {
      await adjustFundAccountBalance('BANK', bankAccount.id, -input.bounceChargeAmount);
    }

    const updated = await chequeRepository.update(id, {
      status: 'BOUNCED',
      bounceReason: input.bounceReason,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Cheque',
      entityId: id,
      description: `Bounced cheque ${cheque.chequeNumber}: ${input.bounceReason}`,
    });

    return updated;
  },

  async cancel(id: string, input: CancelChequeInput, actorId: string) {
    const cheque = await chequeRepository.findByIdBasic(id);
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (!['ISSUED', 'RECEIVED'].includes(cheque.status)) {
      throw new AppError(`Cheque is ${cheque.status} and cannot be cancelled — only before it is deposited/presented`, 409);
    }

    const updated = await chequeRepository.update(id, {
      status: 'CANCELLED',
      cancellationReason: input.reason,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Cheque',
      entityId: id,
      description: `Cancelled cheque ${cheque.chequeNumber}: ${input.reason}`,
    });

    return updated;
  },

  /** Stop Payment — only an ISSUED cheque not yet presented. It never touched the bank balance, so nothing to reverse. */
  async stopPayment(id: string, input: CancelChequeInput, actorId: string) {
    const cheque = await chequeRepository.findByIdBasic(id);
    if (!cheque) throw new AppError('Cheque not found', 404);
    if (cheque.direction !== 'ISSUED') throw new AppError('Stop payment only applies to issued cheques', 409);
    if (cheque.status !== 'ISSUED') throw new AppError(`Cheque is ${cheque.status}, not ISSUED`, 409);

    const updated = await chequeRepository.update(id, {
      status: 'STOP_PAYMENT',
      stopPaymentReason: input.reason,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Cheque',
      entityId: id,
      description: `Stop payment on cheque ${cheque.chequeNumber}: ${input.reason}`,
    });

    return updated;
  },
};
