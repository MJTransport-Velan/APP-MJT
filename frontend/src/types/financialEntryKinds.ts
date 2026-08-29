/**
 * Transaction kinds — the catalogue of things the business actually does with
 * money, served by the backend at GET /accounts/financial-entries/kinds.
 *
 * The shapes here mirror backend/src/services/financial-entry-kinds/types.ts.
 * The catalogue is fetched rather than duplicated so the two can never drift:
 * adding a transaction is a backend-only change and this screen picks it up.
 */
export type EntryKindGroup = 'MONEY_IN' | 'MONEY_OUT' | 'TRANSFER';

export type EntryKindFieldType =
  | 'party'
  | 'fundAccount'
  /** A picker over the live Loan register — the lender is never typed in. */
  | 'loan'
  /** The chosen loan's own unpaid EMIs; options depend on the `loan` field. */
  | 'loanInstallment'
  | 'amount'
  | 'date'
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'month';

export type EntryKindPartyType =
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'DRIVER'
  | 'EMPLOYEE'
  | 'VEHICLE'
  | 'TRIP'
  | 'LOAN_PROVIDER';

export interface EntryKindField {
  name: string;
  label: string;
  type: EntryKindFieldType;
  required?: boolean;
  partyType?: EntryKindPartyType;
  options?: { label: string; value: string }[];
  placeholder?: string;
  hint?: string;
  /** Renders only when another field already holds one of these values. */
  showWhen?: { field: string; equals: string[] };
  /** This field's options come from whatever the named field selected. */
  dependsOn?: string;
}

export interface EntryKind {
  key: string;
  label: string;
  description: string;
  icon: string;
  group: EntryKindGroup;
  fields: EntryKindField[];
}

export const ENTRY_KIND_GROUP_LABELS: Record<EntryKindGroup, string> = {
  MONEY_IN: 'Money In',
  MONEY_OUT: 'Money Out',
  TRANSFER: 'Transfer',
};
