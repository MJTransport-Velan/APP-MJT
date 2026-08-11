/**
 * The one rule the whole Voucher Engine exists to enforce: Total Debit
 * must equal Total Credit, checked before every save — not only before
 * approval or posting. No voucher, in any status, is ever persisted
 * unbalanced.
 */
import { AppError } from '../middlewares/error.middleware';

// Accepts plain numbers (from request payloads) as well as Prisma's
// Decimal/string-ish amount types (from rows already fetched out of the
// database) — both shapes flow through the same balance check.
type AmountLike = number | string | { toNumber(): number } | null | undefined;

export interface VoucherLineAmounts {
  debitAmount?: AmountLike;
  creditAmount?: AmountLike;
}

function toAmount(value: AmountLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return value.toNumber();
}

/** Every line must be exactly debit XOR credit — never both, never neither. */
export function assertLineShape(lines: VoucherLineAmounts[]): void {
  if (lines.length < 2) {
    throw new AppError('A voucher needs at least 2 lines', 422);
  }
  lines.forEach((line, index) => {
    const hasDebit = toAmount(line.debitAmount) > 0;
    const hasCredit = toAmount(line.creditAmount) > 0;
    if (hasDebit === hasCredit) {
      throw new AppError(
        `Line ${index + 1}: exactly one of debit or credit amount must be greater than 0`,
        422
      );
    }
  });
}

export function computeTotals(lines: VoucherLineAmounts[]): { totalDebit: number; totalCredit: number } {
  const totalDebit = lines.reduce((sum, l) => sum + toAmount(l.debitAmount), 0);
  const totalCredit = lines.reduce((sum, l) => sum + toAmount(l.creditAmount), 0);
  return { totalDebit: Number(totalDebit.toFixed(2)), totalCredit: Number(totalCredit.toFixed(2)) };
}

/** No exceptions — this is checked at create, at every line edit, and again immediately before enqueue. */
export function assertBalanced(totalDebit: number, totalCredit: number): void {
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AppError(
      `Voucher is not balanced — Total Debit ${totalDebit.toFixed(2)} does not equal Total Credit ${totalCredit.toFixed(2)}`,
      422
    );
  }
}
