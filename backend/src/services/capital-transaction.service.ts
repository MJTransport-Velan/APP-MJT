/**
 * Capital Account money movement — a partner CONTRIBUTION credits a real
 * Bank/Cash account (money coming in), a WITHDRAWAL debits one (money
 * going out), through the same adjustFundAccountBalance primitive every
 * other module in this app uses. No ledger/account-group: a partner's
 * capital balance is simply SUM(CONTRIBUTION) − SUM(WITHDRAWAL),
 * computed live wherever it's needed (this service, balance-sheet.service.ts).
 */
import { Request } from 'express';
import { capitalTransactionRepository, CapitalTransactionWithRelations } from '../repositories/capital-transaction.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateCapitalTransactionInput } from '../validators/capital-transaction.validator';

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

/** delta applied to the fund account: a CONTRIBUTION brings money in (+), a WITHDRAWAL takes money out (-). */
function fundDelta(type: string, amount: number) {
  return type === 'CONTRIBUTION' ? amount : -amount;
}

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
    if (input.type === 'WITHDRAWAL' && fundAccount.currentBalance < input.amount) {
      throw new AppError(`Insufficient balance in ${fundAccount.label} to withdraw ${input.amount}`, 409);
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
      description: `Recorded ${input.type === 'CONTRIBUTION' ? 'capital contribution from' : 'capital withdrawal by'} ${partner.name}: ${input.amount}`,
    });

    return capitalTransactionService.getById(transaction.id);
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

  /** A single partner's capital state — Total Contributed / Withdrawn / Net Balance, same shape as financial-state.service.ts's driverState/employeeState. */
  async partnerState(partnerId: string) {
    const partner = await capitalTransactionRepository.findPartnerById(partnerId);
    if (!partner) throw new AppError('Capital Partner not found', 404);

    const transactions = await capitalTransactionRepository.findAllByPartner(partnerId);
    const totalContributed = round2(transactions.filter((t) => t.type === 'CONTRIBUTION').reduce((s, t) => s + Number(t.amount), 0));
    const totalWithdrawn = round2(transactions.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + Number(t.amount), 0));

    return {
      partner: { id: partner.id, name: partner.name },
      totalContributed,
      totalWithdrawn,
      netBalance: round2(totalContributed - totalWithdrawn),
      transactions: transactions.map((t) => ({ id: t.id, transactionNumber: t.transactionNumber, type: t.type, amount: Number(t.amount), transactionDate: t.transactionDate, remarks: t.remarks })),
    };
  },
};
