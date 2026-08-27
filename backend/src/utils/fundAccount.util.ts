/**
 * BankTransfer.fromAccountType/fromAccountId and toAccountType/toAccountId
 * (and every other "which fund account did this touch" field across
 * Receipt/SupplierPayment/DriverAdvance/etc.) are app-level polymorphic
 * references — a single column can't physically FK both BankAccount and
 * CashAccount. This is the one place their existence is resolved AND the
 * one place a BankAccount/CashAccount's currentBalance is actually mutated
 * — every money movement in the app goes through adjustFundAccountBalance
 * so there is exactly one code path that can change a fund account's
 * balance, mirroring the old "everything is a Voucher" discipline without
 * an actual ledger underneath.
 */
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';

export interface ResolvedFundAccount {
  type: 'BANK' | 'CASH';
  id: string;
  label: string;
  currentBalance: number;
  isActive: boolean;
}

export async function resolveFundAccount(
  organizationId: string,
  type: 'BANK' | 'CASH',
  id: string
): Promise<ResolvedFundAccount> {
  if (type === 'BANK') {
    const account = await prisma.bankAccount.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!account) throw new AppError('Bank Account not found for this organization', 422);
    return { type, id: account.id, label: account.accountHolderName, currentBalance: Number(account.currentBalance), isActive: account.isActive };
  }

  const account = await prisma.cashAccount.findFirst({ where: { id, organizationId, deletedAt: null } });
  if (!account) throw new AppError('Cash Account not found for this organization', 422);
  return { type, id: account.id, label: account.cashAccountType, currentBalance: Number(account.currentBalance), isActive: account.isActive };
}

/**
 * Falls back to the organization's default Cash Account when a caller
 * doesn't specify a fund account — used by Receipt/SupplierPayment so
 * pre-existing internal callers (Trip-allocation's advance shortcut) still
 * produce a valid money movement rather than being forced to plumb a
 * fund-account picker through Operations.
 */
export async function resolveOrDefaultFundAccount(
  organizationId: string,
  type: 'BANK' | 'CASH' | undefined,
  id: string | undefined
): Promise<ResolvedFundAccount> {
  if (type && id) return resolveFundAccount(organizationId, type, id);

  const defaultCash = await prisma.cashAccount.findFirst({
    where: { organizationId, isActive: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!defaultCash) {
    throw new AppError('No fund account was specified and no default Cash Account exists for this organization — configure one under Banking first', 409);
  }
  return { type: 'CASH', id: defaultCash.id, label: defaultCash.cashAccountType, currentBalance: Number(defaultCash.currentBalance), isActive: defaultCash.isActive };
}

export async function assertFundAccountsDiffer(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string
): Promise<void> {
  if (fromType === toType && fromId === toId) {
    throw new AppError('Transfer From and To account cannot be the same account', 422);
  }
}

/**
 * delta > 0 = money coming in (increase balance); delta < 0 = money going out
 * (decrease balance).
 *
 * A cash account represents physical notes in a drawer, so it cannot go
 * below zero — an overdraw means the payment never actually happened. This
 * was previously a bare increment with no check anywhere in this function,
 * and individual callers were inconsistent about guarding it, which is how
 * the MAIN cash account reached a negative balance. Bank accounts are left
 * unguarded on purpose: a real account can be overdrawn, and blocking that
 * here would break legitimate postings.
 *
 * Pass `allowNegative` for a deliberate correction (e.g. reversing an entry
 * whose original credit has already been undone).
 */
export async function adjustFundAccountBalance(
  type: 'BANK' | 'CASH',
  id: string,
  delta: number,
  options: { allowNegative?: boolean } = {}
): Promise<void> {
  if (type === 'BANK') {
    await prisma.bankAccount.update({ where: { id }, data: { currentBalance: { increment: delta } } });
    return;
  }

  if (delta < 0 && !options.allowNegative) {
    const account = await prisma.cashAccount.findUnique({
      where: { id },
      select: { currentBalance: true, cashAccountType: true },
    });
    if (account) {
      const available = Number(account.currentBalance);
      if (available + delta < 0) {
        throw new AppError(
          `The ${account.cashAccountType} cash account holds ${available.toFixed(2)}, which is not enough for this ${Math.abs(delta).toFixed(2)} payment.`,
          409
        );
      }
    }
  }

  await prisma.cashAccount.update({ where: { id }, data: { currentBalance: { increment: delta } } });
}

/**
 * Refuses to let a BankAccount/CashAccount be hard-deleted while anything
 * still points at it.
 *
 * Only some of those pointers are real foreign keys the database can defend
 * (ChequeBook, Cheque, PettyCashRequest) — every "which account did this
 * money move through" field listed at the top of this file is polymorphic,
 * so Postgres sees nothing to restrict and the row would delete cleanly,
 * silently orphaning receipts, transfers and loan installments. This is the
 * guard that stands in for the missing constraints.
 */
export async function assertFundAccountUnreferenced(type: 'BANK' | 'CASH', id: string): Promise<void> {
  const polymorphic = { fundAccountType: type, fundAccountId: id };

  const checks: { label: string; count: Promise<number> }[] = [
    { label: 'bank transfers', count: prisma.bankTransfer.count({ where: { OR: [{ fromAccountType: type, fromAccountId: id }, { toAccountType: type, toAccountId: id }] } }) },
    { label: 'financial entries', count: prisma.financialEntry.count({ where: { OR: [{ sourceType: type, sourceId: id }, { destinationType: type, destinationId: id }] } }) },
    { label: 'receipts', count: prisma.receipt.count({ where: polymorphic }) },
    { label: 'supplier payments', count: prisma.supplierPayment.count({ where: polymorphic }) },
    { label: 'capital transactions', count: prisma.capitalTransaction.count({ where: polymorphic }) },
    { label: 'driver advances', count: prisma.driverAdvance.count({ where: polymorphic }) },
    { label: 'employee advances', count: prisma.employeeAdvance.count({ where: polymorphic }) },
    { label: 'loans', count: prisma.loan.count({ where: polymorphic }) },
    { label: 'loan installments', count: prisma.loanInstallment.count({ where: polymorphic }) },
    { label: 'fastag transactions', count: prisma.fastTagTransaction.count({ where: { fundAccountType: type, fundAccountId: id } }) },
    { label: 'diesel card recharges', count: prisma.fuelCardTransaction.count({ where: { fundAccountType: type, fundAccountId: id } }) },
    { label: 'opening balances', count: type === 'BANK' ? prisma.openingBalance.count({ where: { bankAccountId: id } }) : prisma.openingBalance.count({ where: { cashAccountId: id } }) },
  ];

  const counts = await Promise.all(checks.map((check) => check.count));
  const blocking = checks
    .map((check, index) => ({ label: check.label, count: counts[index] }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${entry.label}`);

  if (blocking.length) {
    throw new AppError(
      `This account has already been used by ${blocking.join(', ')} and cannot be deleted. Deactivate it instead.`,
      409
    );
  }
}
