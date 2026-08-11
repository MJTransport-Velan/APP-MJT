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

/** delta > 0 = money coming in (increase balance); delta < 0 = money going out (decrease balance). */
export async function adjustFundAccountBalance(type: 'BANK' | 'CASH', id: string, delta: number): Promise<void> {
  if (type === 'BANK') {
    await prisma.bankAccount.update({ where: { id }, data: { currentBalance: { increment: delta } } });
  } else {
    await prisma.cashAccount.update({ where: { id }, data: { currentBalance: { increment: delta } } });
  }
}
