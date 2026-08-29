/**
 * Financial Entry — transaction kinds.
 *
 * WHY THIS EXISTS
 *
 * FinancialEntry stores a deliberately generic shape: money moved from some
 * party to some other party, tagged with an entry type and a purpose. That is
 * a good STORAGE model — one table holds every money movement — but it made a
 * poor INPUT model. The create endpoint accepted any combination of 12 entry
 * types, 11 source types, 11 destination types and 16 purposes: roughly 2,300
 * shapes, of which about fifteen mean anything. Nothing rejected
 * `MONEY_RECEIVED / BANK -> BANK / purpose FUEL`.
 *
 * Worse, what an entry actually DID was re-derived at post time by pattern
 * matching that tuple (see inferPostingPlan in financial-entry.service.ts).
 * The meaning of "a salary payment" was spread across a delegate lookup, a
 * settlement branch and a fleet-linkage branch, with load-bearing ordering
 * between the guards.
 *
 * A kind turns that inside out. Each one names a real transaction the
 * business does, declares the handful of fields it needs, and states its
 * posting behaviour OUTRIGHT rather than leaving it to be inferred. The
 * generic tuple becomes derived output. Adding a transaction means adding a
 * file, not editing four `if` chains.
 *
 * The legacy generic endpoint still works and still infers — this is a typed
 * façade over the same posting engine, not a replacement for it.
 */
import { z } from 'zod';
import { CreateFinancialEntryInput } from '../../validators/financial-entry.validator';

/**
 * What a posted entry should actually DO. Every kind names one explicitly, so
 * nothing has to be re-derived from the source/destination tuple.
 *
 * - SETTLE_CUSTOMER_FIFO / SETTLE_SUPPLIER_FIFO clear the oldest invoices or
 *   bills first, creating the Receipts / SupplierPayments as they go.
 * - DELEGATE hands the movement to the module that already owns that kind of
 *   bookkeeping (bank transfers, advances, salary payments), so AR/AP and
 *   advance tracking stay correct without a parallel implementation.
 * - FUND_MOVEMENT is the plain case: adjust whichever side is a real
 *   Bank/Cash account, optionally mirroring the cost into a Fleet record.
 */
export type DelegateKey =
  | 'BANK_TRANSFER'
  | 'DRIVER_ADVANCE'
  | 'EMPLOYEE_ADVANCE'
  | 'EMPLOYEE_SALARY_PAYMENT'
  | 'DRIVER_SALARY_PAYMENT';

export type PostingPlan =
  | { post: 'SETTLE_CUSTOMER_FIFO' }
  | { post: 'SETTLE_SUPPLIER_FIFO' }
  | { post: 'DELEGATE'; delegate: DelegateKey }
  | { post: 'FUND_MOVEMENT' };

/**
 * One input on a kind's form. The frontend renders from these rather than
 * hard-coding a form per kind, so the catalogue below is the single source of
 * truth for both sides and the two cannot drift.
 */
export type FieldType =
  | 'party' // a picker over one master (Customer, Supplier, Driver, ...)
  | 'fundAccount' // the Bank/Cash account the money moves through
  | 'loan' // a picker over the live Loan register
  | 'loanInstallment' // the chosen loan's own unpaid EMIs
  | 'amount'
  | 'date'
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'month';

export interface KindField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** For `party`: which master to pick from. */
  partyType?: 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'EMPLOYEE' | 'VEHICLE' | 'TRIP' | 'LOAN_PROVIDER';
  /** For `select`: the fixed choices. */
  options?: { label: string; value: string }[];
  placeholder?: string;
  hint?: string;
  /** Renders only when another field already holds one of these values. */
  showWhen?: { field: string; equals: string[] };
  /**
   * This field's options come from whatever the named field selected — a
   * loan's own unpaid EMIs, for instance. The form clears it whenever the
   * field it depends on changes.
   */
  dependsOn?: string;
}

export interface EntryKind {
  /** Stable key. Stored on nothing — it is derived back into the generic tuple. */
  key: string;
  label: string;
  /** One line, shown under the label on the picker tile. */
  description: string;
  icon: string;
  group: 'MONEY_IN' | 'MONEY_OUT' | 'TRANSFER';
  fields: KindField[];
  /** Validates just this kind's fields — narrow, not the 2,300-shape schema. */
  schema: z.ZodTypeAny;
  /** Derives the stored generic entry from the kind's own fields. */
  toEntry(fields: Record<string, unknown>): CreateFinancialEntryInput;
  /** What posting should do. Stated, never inferred. */
  plan(fields: Record<string, unknown>): PostingPlan;
  /**
   * Some transactions are owned outright by another module, which already
   * writes its own FinancialEntry as part of doing the job. A Loan EMI is the
   * clear case: loanService.payEmi validates the principal/interest split
   * against the schedule, marks the installment paid, closes the loan when it
   * is finished AND records the entry. Posting such a kind through the
   * generic pipeline would move the money without ever advancing the
   * schedule, leaving the loan permanently owing what was in fact paid.
   *
   * When present, this replaces toEntry/plan entirely.
   */
  handler?(fields: Record<string, unknown>, actorId: string): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Field shorthands — every kind needs an amount, a date and usually an account,
// so they are declared once here rather than copied fifteen times.
// ---------------------------------------------------------------------------

export const amountField = (label = 'Amount'): KindField => ({
  name: 'amount',
  label,
  type: 'amount',
  required: true,
});

export const dateField = (label = 'Date'): KindField => ({
  name: 'entryDate',
  label,
  type: 'date',
  required: true,
});

export const fundAccountField = (label: string): KindField => ({
  name: 'fundAccountKey',
  label,
  type: 'fundAccount',
  required: true,
});

export const paymentModeField: KindField = {
  name: 'paymentModeId',
  label: 'Payment Mode',
  type: 'select',
  options: [],
};

export const referenceField: KindField = {
  name: 'referenceNumber',
  label: 'Reference No.',
  type: 'text',
  placeholder: 'Cheque / UTR / bill number',
};

export const remarksField: KindField = { name: 'remarks', label: 'Remarks', type: 'textarea' };

/** Shared shape for the fields nearly every kind carries. */
export const baseSchema = {
  amount: z.number().positive('Amount must be greater than 0'),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  paymentModeId: z.string().uuid().optional(),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional(),
};

/**
 * The Bank/Cash account arrives from the UI as one "BANK:<uuid>" string,
 * because a single dropdown listing both is far easier to use than a type
 * picker plus a dependent account picker. Split here, once.
 */
export const fundAccountKeySchema = z
  .string()
  .regex(/^(BANK|CASH):[0-9a-fA-F-]{36}$/, 'Choose the Bank or Cash account');

export function splitFundAccountKey(key: string): { type: 'BANK' | 'CASH'; id: string } {
  const [type, id] = key.split(':');
  return { type: type as 'BANK' | 'CASH', id };
}

/** Pulls the fields every kind shares onto the generic entry. */
export function baseEntryFields(f: Record<string, unknown>) {
  return {
    amount: f.amount as number,
    entryDate: f.entryDate as string,
    paymentModeId: (f.paymentModeId as string) || undefined,
    referenceNumber: (f.referenceNumber as string) || undefined,
    remarks: (f.remarks as string) || undefined,
  };
}
