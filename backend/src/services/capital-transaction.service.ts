/**
 * Capital & Owner Funds money movement. Four transaction types across two
 * genuinely different instruments, which is the whole reason this screen
 * exists (spec §9–§12):
 *
 *   CONTRIBUTION         money in  → Owner Capital      (EQUITY  +)
 *   WITHDRAWAL           money out → Owner Capital      (EQUITY  −, a drawing)
 *   OWNER_LOAN_RECEIVED  money in  → Owner Loan         (LIABILITY +)
 *   OWNER_LOAN_REPAYMENT money out → Owner Loan         (LIABILITY −)
 *
 * An owner handing the business ₹50,00,000 may be ₹30,00,000 of capital and
 * ₹20,00,000 of loan; recording it as one ₹50,00,000 "capital" figure
 * overstates equity and hides the debt. Repaying an owner loan is therefore
 * NOT a capital withdrawal and must never be recorded as one.
 *
 * Every type credits or debits a real Bank/Cash account through the same
 * adjustFundAccountBalance primitive every other module uses. No
 * ledger/account-group: a partner's balances are simply sums over these
 * rows, computed live wherever needed (this service, balance-sheet.service.ts).
 */
import { Request } from 'express';
import { capitalTransactionRepository, CapitalTransactionWithRelations } from '../repositories/capital-transaction.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateCapitalTransactionInput, UpdateCapitalTransactionInput } from '../validators/capital-transaction.validator';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function serialize(t: CapitalTransactionWithRelations) {
  return {
    id: t.id,
    transactionNumber: t.transactionNumber,
    type: t.type,
    amount: Number(t.amount),
    transactionDate: t.transactionDate,
    fundAccountType: t.fundAccountType,
    fundAccountId: t.fundAccountId,
    remarks: t.remarks,
    partner: { id: t.partner.id, name: t.partner.name },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** The two inbound types bring money in (+); the two outbound types take it out (−). */
const MONEY_IN_TYPES = new Set(['CONTRIBUTION', 'OWNER_LOAN_RECEIVED']);

function fundDelta(type: string, amount: number) {
  return MONEY_IN_TYPES.has(type) ? amount : -amount;
}

/** Which of the two instruments a type belongs to — equity or liability. */
function bucketOf(type: string): 'CAPITAL' | 'OWNER_LOAN' {
  return type === 'CONTRIBUTION' || type === 'WITHDRAWAL' ? 'CAPITAL' : 'OWNER_LOAN';
}

const TYPE_LABELS: Record<string, string> = {
  CONTRIBUTION: 'capital contribution from',
  WITHDRAWAL: 'capital withdrawal by',
  OWNER_LOAN_RECEIVED: 'owner loan received from',
  OWNER_LOAN_REPAYMENT: 'owner loan repayment to',
};

export const capitalTransactionService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await capitalTransactionRepository.findManyPaginated({
      skip,
      take,
      partnerId: (query.partnerId as string) || undefined,
      type: (query.type as string) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const t = await capitalTransactionRepository.findById(id);
    if (!t) throw new AppError('Capital Transaction not found', 404);
    return serialize(t);
  },

  async create(input: CreateCapitalTransactionInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);

    const partner = await capitalTransactionRepository.findPartnerById(input.partnerId);
    if (!partner) throw new AppError('Capital Partner not found', 404);
    if (!partner.isActive) throw new AppError('Capital Partner is inactive', 409);

    const fundAccount = await resolveFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);
    const isMoneyOut = !MONEY_IN_TYPES.has(input.type);
    if (isMoneyOut && fundAccount.currentBalance < input.amount) {
      const verb = input.type === 'WITHDRAWAL' ? 'withdraw' : 'repay';
      throw new AppError(`Insufficient balance in ${fundAccount.label} to ${verb} ${input.amount}`, 409);
    }

    // You cannot repay more owner loan than the business actually owes that
    // partner — that would push the liability negative and silently turn
    // itself into an unrecorded capital withdrawal.
    if (input.type === 'OWNER_LOAN_REPAYMENT') {
      const state = await capitalTransactionService.partnerState(input.partnerId);
      if (input.amount - state.ownerLoanBalance > 0.01) {
        throw new AppError(
          `${partner.name} is owed ${state.ownerLoanBalance} — repaying ${input.amount} would overpay the owner loan. Record the excess as a Capital Withdrawal instead.`,
          422
        );
      }
    }

    const transactionDate = input.transactionDate ? input.transactionDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const transactionNumber = await capitalTransactionRepository.nextTransactionNumber();

    const transaction = await capitalTransactionRepository.create({
      transactionNumber,
      partnerId: input.partnerId,
      type: input.type,
      amount: input.amount,
      transactionDate: new Date(`${transactionDate}T00:00:00.000Z`),
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      remarks: input.remarks,
      organizationId,
      createdById: actorId,
      updatedById: actorId,
    });

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, fundDelta(input.type, input.amount));

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'CapitalTransaction',
      entityId: transaction.id,
      description: `Recorded ${TYPE_LABELS[input.type] ?? input.type} ${partner.name}: ${input.amount}`,
    });

    return capitalTransactionService.getById(transaction.id);
  },

  /**
   * Corrects a recorded transaction: the fund account movement the original
   * made is backed out and the corrected one applied, so an amount or account
   * fix never leaves a bank balance carrying the old figure.
   */
  async update(id: string, input: UpdateCapitalTransactionInput, actorId: string) {
    const existing = await capitalTransactionRepository.findById(id);
    if (!existing) throw new AppError('Capital Transaction not found', 404);

    const type = input.type ?? existing.type;
    const amount = input.amount ?? Number(existing.amount);
    const fundAccountType = input.fundAccountType ?? (existing.fundAccountType as 'BANK' | 'CASH');
    const fundAccountId = input.fundAccountId ?? existing.fundAccountId;

    const organizationId = await organizationService.resolveOrganizationId(existing.organizationId ?? undefined);
    const fundAccount = await resolveFundAccount(organizationId, fundAccountType, fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    const updated = await capitalTransactionRepository.update(id, {
      type,
      amount,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : undefined,
      fundAccountType,
      fundAccountId,
      remarks: input.remarks,
      updatedById: actorId,
    });

    await adjustFundAccountBalance(
      existing.fundAccountType as 'BANK' | 'CASH',
      existing.fundAccountId,
      -fundDelta(existing.type, Number(existing.amount)),
      { allowNegative: true }
    );
    await adjustFundAccountBalance(fundAccountType, fundAccountId, fundDelta(type, amount), { allowNegative: true });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'CapitalTransaction',
      entityId: id,
      description: `Updated capital transaction ${existing.transactionNumber}`,
    });

    return capitalTransactionService.getById(updated.id);
  },

  async remove(id: string, actorId: string) {
    const existing = await capitalTransactionRepository.findById(id);
    if (!existing) throw new AppError('Capital Transaction not found', 404);

    await capitalTransactionRepository.softDelete(id, actorId);
    await adjustFundAccountBalance(existing.fundAccountType, existing.fundAccountId, -fundDelta(existing.type, Number(existing.amount)));

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'CapitalTransaction',
      entityId: id,
      description: `Deleted capital transaction ${existing.transactionNumber}`,
    });
  },

  /**
   * A single partner's state, with equity and liability reported separately
   * so the two are never added together by a caller (spec §12).
   * netBalance stays the capital-only figure it always was — callers that
   * mean "what does the business owe this owner" want ownerLoanBalance.
   */
  async partnerState(partnerId: string) {
    const partner = await capitalTransactionRepository.findPartnerById(partnerId);
    if (!partner) throw new AppError('Capital Partner not found', 404);

    const transactions = await capitalTransactionRepository.findAllByPartner(partnerId);
    const sumOf = (type: string) => round2(transactions.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0));

    const totalContributed = sumOf('CONTRIBUTION');
    const totalWithdrawn = sumOf('WITHDRAWAL');
    const ownerLoanReceived = sumOf('OWNER_LOAN_RECEIVED');
    const ownerLoanRepaid = sumOf('OWNER_LOAN_REPAYMENT');

    return {
      partner: { id: partner.id, name: partner.name },
      // Equity side
      totalContributed,
      totalWithdrawn,
      capitalBalance: round2(totalContributed - totalWithdrawn),
      // Liability side — what the business still owes this owner
      ownerLoanReceived,
      ownerLoanRepaid,
      ownerLoanBalance: round2(ownerLoanReceived - ownerLoanRepaid),
      // Retained for existing callers: capital only, never capital + loan.
      netBalance: round2(totalContributed - totalWithdrawn),
      transactions: transactions.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        type: t.type,
        bucket: bucketOf(t.type),
        amount: Number(t.amount),
        transactionDate: t.transactionDate,
        remarks: t.remarks,
      })),
    };
  },
};
