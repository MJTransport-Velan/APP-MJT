import { AppError } from '../middlewares/error.middleware';

/**
 * Today's calendar date in the server's own timezone, as YYYY-MM-DD.
 *
 * Deliberately not `toISOString().slice(0, 10)`: that converts to UTC first,
 * which reports "yesterday" for roughly the first 5.5 hours of every IST day
 * (and on any server running east of UTC).
 */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Rejects a money movement dated in the future.
 *
 * Bank and cash balances are running totals mutated the moment a record is
 * saved (adjustFundAccountBalance) — they carry no date at all. Reports that
 * *are* date-filtered, notably the Balance Sheet, therefore disagree with them
 * whenever a payment is post-dated: the cash shows up in Bank & Cash straight
 * away while the receivable it settled is still counted as outstanding, so the
 * same money appears twice and Total Assets is overstated until the date
 * arrives.
 *
 * Accepting only today or earlier keeps the two consistent. A genuinely
 * post-dated instrument belongs in the Cheque register, which has its own
 * issue/clearance dates and only moves the bank balance on clearance.
 */
export function assertNotFutureDate(dateStr: string, label: string): void {
  const today = todayStr();
  if (dateStr.slice(0, 10) > today) {
    throw new AppError(
      `${label} cannot be in the future (today is ${today}). To record a post-dated instrument, use the Cheque register instead.`,
      422
    );
  }
}
