/**
 * Loans & Advances Given — money the business lends OUT, to a friend, a
 * relative, or anyone with no master record of their own.
 *
 * This is the mirror image of Loans & EMI, which only ever holds money the
 * business BORROWED. The distinction matters on the Balance Sheet: a loan
 * taken is a liability, a loan given is an asset.
 *
 * The rule that shapes everything here: lending money is NOT an expense. It
 * is an asset swap — cash becomes something owed back — so nothing in this
 * file touches Profit & Loss, and no expense row is mirrored anywhere. What
 * it does do is move real money: giving debits the chosen Bank/Cash account
 * and a repayment credits it, both through adjustFundAccountBalance, the
 * one code path allowed to change a fund account balance.
 *
 * No FinancialEntry is written. financialEntryService.create() would adjust
 * the fund account a second time (the same trap loan.service documents for
 * EMI payments), and an entry here would read as money spent when it is not.
 *
 * Nothing stores the outstanding amount: it is always
 * amount - SUM(repayments), computed live, exactly like every other balance
 * in this app.
 *
 * Migration (Phase 18): a loan that was already out on the migration date is
 * registered here with origin = OPENING, mirroring Loan.origin. Registering
 * one moves NO money — the opening Bank/Cash balance already reflects that
 * the cash left the business — but it is otherwise an ordinary record, so it
 * tracks repayments and can be written off like any other. Repayments
 * received after the migration are real money and always move the account.
 */
import { Request } from 'express';
import { loanGivenRepository, LoanGivenWithRelations } from '../repositories/loan-given.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import {
  CreateLoanGivenInput,
  UpdateLoanGivenInput,
  RecordRepaymentInput,
  WriteOffLoanGivenInput,
} from '../validators/loan-given.validator';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const EPS = 0.01;

function toDateOnly(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/** Derived money position for one loan given — never stored, always recomputed. */
function totals(loan: { amount: unknown; expectedReturnDate: Date | null; status: string; repayments: { amount: unknown }[] }) {
  const repaid = round2(loan.repayments.reduce((s, r) => s + Number(r.amount), 0));
  const outstanding = round2(Math.max(Number(loan.amount) - repaid, 0));
  // Written-off money is no longer expected back, so it is never overdue.
  const overdue =
    loan.status !== 'WRITTEN_OFF' &&
    outstanding > EPS &&
    loan.expectedReturnDate != null &&
    loan.expectedReturnDate.getTime() < Date.now();
  return { repaid, outstanding, repaymentCount: loan.repayments.length, isOverdue: overdue };
}

function serialize(loan: LoanGivenWithRelations) {
  return {
    id: loan.id,
    referenceNumber: loan.referenceNumber,
    partyName: loan.partyName,
    partyContact: loan.partyContact,
    amount: Number(loan.amount),
    givenDate: loan.givenDate,
    expectedReturnDate: loan.expectedReturnDate,
    fundAccountType: loan.fundAccountType,
    fundAccountId: loan.fundAccountId,
    status: loan.status,
    origin: loan.origin,
    openingAsOfDate: loan.openingAsOfDate,
    remarks: loan.remarks,
    writtenOffAt: loan.writtenOffAt,
    writtenOffReason: loan.writtenOffReason,
    totals: totals(loan),
    repayments: loan.repayments.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      repaymentDate: r.repaymentDate,
      fundAccountType: r.fundAccountType,
      fundAccountId: r.fundAccountId,
      referenceNumber: r.referenceNumber,
      remarks: r.remarks,
      createdAt: r.createdAt,
    })),
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
}

/**
 * REPAID vs OUTSTANDING follows the arithmetic, so it can never disagree
 * with the repayments. WRITTEN_OFF is a decision, not a sum, so it is left
 * alone here and only writeOff()/reopen() may change it.
 */
async function refreshStatus(id: string, amount: number, actorId: string) {
  const existing = await loanGivenRepository.findByIdBasic(id);
  if (!existing || existing.status === 'WRITTEN_OFF') return;

  const repaid = Number((await loanGivenRepository.repaidTotal(id))._sum.amount ?? 0);
  const status = repaid >= amount - EPS ? 'REPAID' : 'OUTSTANDING';
  if (status !== existing.status) {
    await loanGivenRepository.update(id, { status, updatedById: actorId });
  }
}

export const loanGivenService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    // "to" arrives as a date-only string (YYYY-MM-DD, parsed as UTC
    // midnight) — push it to the end of that day so the whole day counts.
    let to: Date | undefined;
    if (query.to) {
      to = new Date(query.to as string);
      to.setUTCHours(23, 59, 59, 999);
    }
    const { rows, total } = await loanGivenRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      status: (query.status as never) || undefined,
      origin: (query.origin as never) || undefined,
      from: query.from ? new Date(query.from as string) : undefined,
      to,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const loan = await loanGivenRepository.findById(id);
    if (!loan) throw new AppError('Loan given not found', 404);
    return serialize(loan);
  },

  /** Headline figures for the module's own screen — what is still out, what is overdue, what was written off. */
  async summary() {
    const { outstandingRows, writtenOffTotal } = await loanGivenRepository.summary();
    const now = Date.now();

    let totalGiven = 0;
    let totalRepaid = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    for (const row of outstandingRows) {
      const given = Number(row.amount);
      const repaid = row.repayments.reduce((s, r) => s + Number(r.amount), 0);
      const outstanding = Math.max(given - repaid, 0);
      totalGiven += given;
      totalRepaid += repaid;
      if (outstanding > EPS && row.expectedReturnDate && row.expectedReturnDate.getTime() < now) {
        overdueAmount += outstanding;
        overdueCount += 1;
      }
    }

    return {
      totalGiven: round2(totalGiven),
      totalRepaid: round2(totalRepaid),
      totalOutstanding: round2(totalGiven - totalRepaid),
      overdueAmount: round2(overdueAmount),
      overdueCount,
      writtenOffTotal: round2(writtenOffTotal),
    };
  },

  /**
   * Lending the money out: the fund account is debited, and an asset of the
   * same size takes its place.
   *
   * An OPENING loan is the exception. It was already out on the migration
   * date, so the opening Bank/Cash balance entered during migration ALREADY
   * reflects the money having left — debiting again here would take it out
   * twice and understate cash by the loan amount. The account is still
   * recorded, as a note of where the money originally came from.
   */
  async create(input: CreateLoanGivenInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    const isOpening = input.origin === 'OPENING';
    if (!isOpening) {
      await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -input.amount);
    }

    const referenceNumber = await loanGivenRepository.nextReferenceNumber();
    const loan = await loanGivenRepository.create({
      referenceNumber,
      partyName: input.partyName,
      partyContact: input.partyContact,
      amount: input.amount,
      givenDate: toDateOnly(input.givenDate),
      expectedReturnDate: input.expectedReturnDate ? toDateOnly(input.expectedReturnDate) : null,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      origin: isOpening ? 'OPENING' : 'NEW',
      openingAsOfDate: isOpening && input.openingAsOfDate ? toDateOnly(input.openingAsOfDate) : null,
      remarks: input.remarks,
      organizationId,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'LoanGiven',
      entityId: loan.id,
      description: isOpening
        ? `Registered opening loan given: ${input.amount} owed by ${input.partyName} at migration (${referenceNumber}) — no account was debited`
        : `Lent ${input.amount} to ${input.partyName} from ${fundAccount.label} (${referenceNumber})`,
    });
    return serialize(loan);
  },

  /**
   * Corrects the record. Changing the amount or the account it came out of
   * reverses the original debit and re-applies the new one, so the Bank/Cash
   * balance never drifts from what was actually handed over.
   */
  async update(id: string, input: UpdateLoanGivenInput, actorId: string) {
    const existing = await loanGivenRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Loan given not found', 404);
    if (existing.status === 'WRITTEN_OFF') {
      throw new AppError('This loan has been written off — reopen it before editing.', 409);
    }

    const oldAmount = Number(existing.amount);
    const newAmount = input.amount ?? oldAmount;

    const repaid = Number((await loanGivenRepository.repaidTotal(id))._sum.amount ?? 0);
    if (newAmount < repaid - EPS) {
      throw new AppError(
        `${repaid} has already been repaid against this loan, so the amount cannot be reduced to ${newAmount}.`,
        422
      );
    }

    const accountChanged =
      (input.fundAccountType !== undefined && input.fundAccountType !== existing.fundAccountType) ||
      (input.fundAccountId !== undefined && input.fundAccountId !== existing.fundAccountId);

    let fundAccountType = existing.fundAccountType;
    let fundAccountId = existing.fundAccountId;

    // An OPENING loan never debited an account, so there is nothing to reverse
    // and nothing to re-apply — correcting its figure is a correction to the
    // opening position, not a money movement.
    const isOpening = existing.origin === 'OPENING';

    if (!isOpening && (Math.abs(newAmount - oldAmount) > EPS || accountChanged)) {
      const organizationId = await organizationService.resolveOrganizationId(undefined);
      // Put the original amount back where it came from...
      await adjustFundAccountBalance(existing.fundAccountType, existing.fundAccountId, oldAmount);
      // ...then take the new amount out of the (possibly different) account.
      const fundAccount = await resolveFundAccount(
        organizationId,
        input.fundAccountType ?? existing.fundAccountType,
        input.fundAccountId ?? existing.fundAccountId
      );
      if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);
      await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -newAmount);
      fundAccountType = fundAccount.type;
      fundAccountId = fundAccount.id;
    } else if (isOpening && accountChanged) {
      // Still record which account it came out of, just without moving money.
      fundAccountType = input.fundAccountType ?? existing.fundAccountType;
      fundAccountId = input.fundAccountId ?? existing.fundAccountId;
    }

    await loanGivenRepository.update(id, {
      partyName: input.partyName,
      partyContact: input.partyContact,
      amount: input.amount,
      givenDate: input.givenDate ? toDateOnly(input.givenDate) : undefined,
      expectedReturnDate:
        input.expectedReturnDate === undefined
          ? undefined
          : input.expectedReturnDate === null
            ? null
            : toDateOnly(input.expectedReturnDate),
      fundAccountType,
      fundAccountId,
      remarks: input.remarks,
      updatedById: actorId,
    });

    await refreshStatus(id, newAmount, actorId);
    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'LoanGiven',
      entityId: id,
      description: `Updated loan given ${existing.referenceNumber} to ${input.partyName ?? existing.partyName}`,
    });
    return loanGivenService.getById(id);
  },

  /** Money coming back: the chosen Bank/Cash account is credited and the outstanding amount falls by the same figure. */
  async recordRepayment(id: string, input: RecordRepaymentInput, actorId: string) {
    const existing = await loanGivenRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Loan given not found', 404);
    if (existing.status === 'WRITTEN_OFF') {
      throw new AppError('This loan has been written off — reopen it before recording money against it.', 409);
    }

    const amount = Number(existing.amount);
    const repaid = Number((await loanGivenRepository.repaidTotal(id))._sum.amount ?? 0);
    const outstanding = round2(amount - repaid);
    if (outstanding <= EPS) throw new AppError('This loan has already been fully repaid', 409);
    if (input.amount > outstanding + EPS) {
      throw new AppError(`Only ${outstanding} is still owed on this loan — a larger repayment cannot be recorded.`, 422);
    }

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, input.amount);

    const repayment = await loanGivenRepository.createRepayment({
      loanGivenId: id,
      amount: input.amount,
      repaymentDate: input.repaymentDate ? toDateOnly(input.repaymentDate) : new Date(),
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      createdById: actorId,
      updatedById: actorId,
    });

    await refreshStatus(id, amount, actorId);
    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'LoanGivenRepayment',
      entityId: repayment.id,
      description: `${existing.partyName} repaid ${input.amount} against ${existing.referenceNumber} into ${fundAccount.label}`,
    });
    return loanGivenService.getById(id);
  },

  /** Reverses one repayment — the money comes back off the account it was credited to. */
  async removeRepayment(id: string, repaymentId: string, actorId: string) {
    const existing = await loanGivenRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Loan given not found', 404);

    const repayment = await loanGivenRepository.findRepayment(id, repaymentId);
    if (!repayment) throw new AppError('Repayment not found on this loan', 404);

    // Taking the credit back can legitimately overdraw a cash account that
    // has already spent the money — this is a correction, not a payment.
    await adjustFundAccountBalance(repayment.fundAccountType, repayment.fundAccountId, -Number(repayment.amount), {
      allowNegative: true,
    });
    await loanGivenRepository.deleteRepayment(repaymentId);

    await refreshStatus(id, Number(existing.amount), actorId);
    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'LoanGivenRepayment',
      entityId: repaymentId,
      description: `Reversed a repayment of ${repayment.amount} against ${existing.referenceNumber}`,
    });
    return loanGivenService.getById(id);
  },

  /**
   * Giving up on the money. No Bank/Cash balance moves — the cash left when
   * it was lent — but the outstanding amount stops counting as an asset, so
   * the Balance Sheet no longer claims it is coming back.
   */
  async writeOff(id: string, input: WriteOffLoanGivenInput, actorId: string) {
    const existing = await loanGivenRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Loan given not found', 404);
    if (existing.status === 'WRITTEN_OFF') throw new AppError('This loan has already been written off', 409);

    const repaid = Number((await loanGivenRepository.repaidTotal(id))._sum.amount ?? 0);
    const outstanding = round2(Number(existing.amount) - repaid);
    if (outstanding <= EPS) throw new AppError('Nothing is outstanding on this loan — there is nothing to write off', 409);

    await loanGivenRepository.update(id, {
      status: 'WRITTEN_OFF',
      writtenOffAt: new Date(),
      writtenOffReason: input.reason,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'LoanGiven',
      entityId: id,
      description: `Wrote off ${outstanding} still owed by ${existing.partyName} on ${existing.referenceNumber}: ${input.reason}`,
    });
    return loanGivenService.getById(id);
  },

  /** Undoes a write-off — the outstanding amount counts as an asset again. */
  async reopen(id: string, actorId: string) {
    const existing = await loanGivenRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Loan given not found', 404);
    if (existing.status !== 'WRITTEN_OFF') throw new AppError('This loan is not written off', 409);

    await loanGivenRepository.update(id, {
      status: 'OUTSTANDING',
      writtenOffAt: null,
      writtenOffReason: null,
      updatedById: actorId,
    });
    await refreshStatus(id, Number(existing.amount), actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'LoanGiven',
      entityId: id,
      description: `Reopened written-off loan ${existing.referenceNumber} — ${existing.partyName} owes it again`,
    });
    return loanGivenService.getById(id);
  },

  /**
   * Deleting undoes the whole thing: the money never left. Repayments are
   * reversed first, so no Bank/Cash balance is left holding money from a
   * loan that no longer exists.
   *
   * Repayments are reversed for an OPENING loan too — those are real money
   * that came in after the migration — but the original amount is not put
   * back, because it was never taken out here in the first place.
   */
  async remove(id: string, actorId: string) {
    const existing = await loanGivenRepository.findById(id);
    if (!existing) throw new AppError('Loan given not found', 404);

    for (const repayment of existing.repayments) {
      await adjustFundAccountBalance(repayment.fundAccountType, repayment.fundAccountId, -Number(repayment.amount), {
        allowNegative: true,
      });
      await loanGivenRepository.deleteRepayment(repayment.id);
    }

    const isOpening = existing.origin === 'OPENING';
    if (!isOpening) {
      await adjustFundAccountBalance(existing.fundAccountType, existing.fundAccountId, Number(existing.amount));
    }

    await loanGivenRepository.softDelete(id, actorId);
    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'LoanGiven',
      entityId: id,
      description: isOpening
        ? `Deleted opening loan given ${existing.referenceNumber} to ${existing.partyName} — no account was credited, none was debited when it was registered`
        : `Deleted loan given ${existing.referenceNumber} to ${existing.partyName} — ${existing.amount} returned to the account it came from`,
    });
  },
};
