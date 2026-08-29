/**
 * The catalogue of transactions the business actually does.
 *
 * Read one entry here and you know everything about that transaction: which
 * fields it asks for, what generic row it becomes, and what posting does. No
 * other file needs consulting. See ./types.ts for why this exists.
 */
import { z } from 'zod';
import { loanService } from '../loan.service';
import {
  EntryKind,
  amountField,
  baseEntryFields,
  baseSchema,
  dateField,
  fundAccountField,
  fundAccountKeySchema,
  paymentModeField,
  referenceField,
  remarksField,
  splitFundAccountKey,
} from './types';

const uuid = z.string().uuid();

/** Money arriving into a Bank/Cash account from a party held on a master. */
function moneyIn(config: {
  key: string;
  label: string;
  description: string;
  icon: string;
  entryType: string;
  purpose: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyLabel: string;
  plan: EntryKind['plan'];
}): EntryKind {
  return {
    key: config.key,
    label: config.label,
    description: config.description,
    icon: config.icon,
    group: 'MONEY_IN',
    fields: [
      { name: 'partyId', label: config.partyLabel, type: 'party', partyType: config.partyType, required: true },
      fundAccountField('Received Into'),
      amountField('Amount Received'),
      dateField('Date Received'),
      paymentModeField,
      referenceField,
      remarksField,
    ],
    schema: z.object({ ...baseSchema, partyId: uuid, fundAccountKey: fundAccountKeySchema }),
    toEntry(f) {
      const account = splitFundAccountKey(f.fundAccountKey as string);
      return {
        entryType: config.entryType,
        purpose: config.purpose,
        sourceType: config.partyType,
        sourceId: f.partyId as string,
        destinationType: account.type,
        destinationId: account.id,
        ...baseEntryFields(f),
      } as never;
    },
    plan: config.plan,
  };
}

/** Money leaving a Bank/Cash account towards some party. */
function moneyOut(config: {
  key: string;
  label: string;
  description: string;
  icon: string;
  entryType: string;
  purpose: string;
  partyType: 'SUPPLIER' | 'CUSTOMER' | 'OTHER';
  partyLabel: string;
  partyIsFreeText?: boolean;
  plan: EntryKind['plan'];
}): EntryKind {
  return {
    key: config.key,
    label: config.label,
    description: config.description,
    icon: config.icon,
    group: 'MONEY_OUT',
    fields: [
      config.partyIsFreeText
        ? { name: 'partyLabel', label: config.partyLabel, type: 'text', required: true }
        : {
            name: 'partyId',
            label: config.partyLabel,
            type: 'party',
            partyType: config.partyType as never,
            required: true,
          },
      fundAccountField('Paid From'),
      amountField('Amount Paid'),
      dateField('Date Paid'),
      paymentModeField,
      referenceField,
      remarksField,
    ],
    schema: z.object({
      ...baseSchema,
      ...(config.partyIsFreeText ? { partyLabel: z.string().min(1, `${config.partyLabel} is required`) } : { partyId: uuid }),
      fundAccountKey: fundAccountKeySchema,
    }),
    toEntry(f) {
      const account = splitFundAccountKey(f.fundAccountKey as string);
      return {
        entryType: config.entryType,
        purpose: config.purpose,
        sourceType: account.type,
        sourceId: account.id,
        destinationType: config.partyType,
        destinationId: config.partyIsFreeText ? undefined : (f.partyId as string),
        destinationLabel: config.partyIsFreeText ? (f.partyLabel as string) : undefined,
        ...baseEntryFields(f),
      } as never;
    },
    plan: config.plan,
  };
}

// ---------------------------------------------------------------- money in

const clientPayment = moneyIn({
  key: 'CLIENT_PAYMENT',
  label: 'Client Payment',
  description: 'Money received from a customer — settles their oldest invoices first',
  icon: 'mdi-account-arrow-left-outline',
  entryType: 'MONEY_RECEIVED',
  purpose: 'CLIENT_PAYMENT',
  partyType: 'CUSTOMER',
  partyLabel: 'Customer',
  plan: () => ({ post: 'SETTLE_CUSTOMER_FIFO' }),
});

const customerAdvance = moneyIn({
  key: 'CUSTOMER_ADVANCE',
  label: 'Customer Advance',
  description: 'Money taken up front, before any invoice exists',
  icon: 'mdi-cash-plus',
  entryType: 'ADVANCE_RECEIVED',
  purpose: 'OTHER',
  partyType: 'CUSTOMER',
  partyLabel: 'Customer',
  plan: () => ({ post: 'FUND_MOVEMENT' }),
});

const supplierRefund = moneyIn({
  key: 'SUPPLIER_REFUND',
  label: 'Refund from Supplier',
  description: 'Money a supplier gave back',
  icon: 'mdi-cash-refund',
  entryType: 'REFUND_RECEIVED',
  purpose: 'SUPPLIER_REFUND',
  partyType: 'SUPPLIER',
  partyLabel: 'Supplier',
  plan: () => ({ post: 'FUND_MOVEMENT' }),
});

/**
 * A disbursement landing in an account. The loan is picked from the register
 * rather than the lender being typed in, so the credit is tied to the loan it
 * belongs to and shows on that loan's own trail.
 *
 * Note this does NOT create the loan or change what it owes — registering a
 * loan is its own thing on the Loans screen, and for a vehicle loan the
 * lender usually pays the dealer directly with nothing reaching your account
 * at all. This kind is only for the case where the money really did arrive.
 */
const loanReceived: EntryKind = {
  key: 'LOAN_RECEIVED',
  label: 'Loan Received',
  description: 'Loan money credited into an account by the lender',
  icon: 'mdi-bank-plus',
  group: 'MONEY_IN',
  fields: [
    { name: 'loanId', label: 'Loan', type: 'loan', required: true, hint: 'Pick the loan this money belongs to' },
    fundAccountField('Received Into'),
    amountField('Amount Received'),
    dateField('Date Received'),
    paymentModeField,
    referenceField,
    remarksField,
  ],
  schema: z.object({ ...baseSchema, loanId: uuid, fundAccountKey: fundAccountKeySchema }),
  toEntry(f) {
    const account = splitFundAccountKey(f.fundAccountKey as string);
    return {
      entryType: 'LOAN_RECEIVED',
      purpose: 'OTHER',
      sourceType: 'LOAN_PROVIDER',
      // resolveEntityLabel turns this into "<lender> — <loan name>" and
      // rejects an id that is not a real loan.
      sourceId: f.loanId as string,
      destinationType: account.type,
      destinationId: account.id,
      ...baseEntryFields(f),
    } as never;
  },
  plan: () => ({ post: 'FUND_MOVEMENT' }),
};

const otherIncome: EntryKind = {
  key: 'OTHER_INCOME',
  label: 'Other Income',
  description: 'Anything else received that the options above do not cover',
  icon: 'mdi-cash-plus',
  group: 'MONEY_IN',
  fields: [
    { name: 'partyLabel', label: 'Received From', type: 'text', required: true },
    fundAccountField('Received Into'),
    amountField('Amount Received'),
    dateField('Date Received'),
    paymentModeField,
    referenceField,
    remarksField,
  ],
  schema: z.object({ ...baseSchema, partyLabel: z.string().min(1, 'Say who it came from'), fundAccountKey: fundAccountKeySchema }),
  toEntry(f) {
    const account = splitFundAccountKey(f.fundAccountKey as string);
    return {
      entryType: 'MONEY_RECEIVED',
      purpose: 'OTHER',
      sourceType: 'OTHER',
      sourceLabel: f.partyLabel as string,
      destinationType: account.type,
      destinationId: account.id,
      ...baseEntryFields(f),
    } as never;
  },
  plan: () => ({ post: 'FUND_MOVEMENT' }),
};

// --------------------------------------------------------------- money out

const supplierPayment = moneyOut({
  key: 'SUPPLIER_PAYMENT',
  label: 'Supplier Payment',
  description: 'Paying a market vendor — settles their oldest bills and trips first',
  icon: 'mdi-truck-outline',
  entryType: 'MONEY_PAID',
  purpose: 'SUPPLIER_PAYMENT',
  partyType: 'SUPPLIER',
  partyLabel: 'Supplier',
  plan: () => ({ post: 'SETTLE_SUPPLIER_FIFO' }),
});

const customerRefund = moneyOut({
  key: 'CUSTOMER_REFUND',
  label: 'Refund to Customer',
  description: 'Money given back to a customer',
  icon: 'mdi-cash-refund',
  entryType: 'REFUND_PAID',
  purpose: 'CUSTOMER_REFUND',
  partyType: 'CUSTOMER',
  partyLabel: 'Customer',
  plan: () => ({ post: 'FUND_MOVEMENT' }),
});

/**
 * An EMI is owned by the Loans module, not by this screen.
 *
 * The lender is not typed in: you pick the loan, then the specific unpaid
 * instalment from its own schedule, and the amount and the principal/interest
 * split come from that instalment. Posting goes through loanService.payEmi,
 * which validates the split, debits the account, marks the instalment paid,
 * closes the loan once it is finished and writes the Financial Entry itself.
 *
 * Recorded any other way the money would move while the schedule stood still,
 * leaving the loan owing what had in fact been paid.
 */
const loanEmi: EntryKind = {
  key: 'LOAN_EMI',
  label: 'Loan EMI',
  description: 'An EMI instalment — picked from the loan’s own schedule',
  icon: 'mdi-bank-outline',
  group: 'MONEY_OUT',
  fields: [
    { name: 'loanId', label: 'Loan', type: 'loan', required: true },
    {
      name: 'installmentId',
      label: 'Which EMI',
      type: 'loanInstallment',
      required: true,
      dependsOn: 'loanId',
      hint: 'Unpaid instalments, oldest first',
    },
    fundAccountField('Paid From'),
    amountField('Amount Paid'),
    dateField('Date Paid'),
    paymentModeField,
    referenceField,
    remarksField,
  ],
  schema: z.object({
    ...baseSchema,
    loanId: uuid,
    installmentId: uuid,
    fundAccountKey: fundAccountKeySchema,
  }),
  // Never reached — handler owns this kind — but kept honest so the shape of
  // the entry payEmi ends up writing is visible here too.
  toEntry(f) {
    const account = splitFundAccountKey(f.fundAccountKey as string);
    return {
      entryType: 'LOAN_REPAYMENT',
      purpose: 'LOAN_EMI',
      sourceType: account.type,
      sourceId: account.id,
      destinationType: 'LOAN_PROVIDER',
      destinationId: f.loanId as string,
      ...baseEntryFields(f),
    } as never;
  },
  plan: () => ({ post: 'FUND_MOVEMENT' }),
  async handler(f, actorId) {
    const account = splitFundAccountKey(f.fundAccountKey as string);
    return loanService.payEmi(
      f.loanId as string,
      f.installmentId as string,
      {
        paidAmount: f.amount as number,
        paidDate: f.entryDate as string,
        fundAccountType: account.type,
        fundAccountId: account.id,
        paymentModeId: (f.paymentModeId as string) || undefined,
        referenceNumber: (f.referenceNumber as string) || undefined,
        remarks: (f.remarks as string) || undefined,
      } as never,
      actorId
    );
  },
};

/*
 * Driver Advance and Employee Advance are deliberately NOT kinds.
 *
 * They belong to the Driver Advances and Employee Advances screens, which run
 * a real request -> approve/reject workflow where approving is its own
 * permission (driverAdvance.approve, distinct from driverAdvance.create).
 * The delegates this screen would have to use call request() and approve()
 * back to back straight on the service, so recording an advance from here
 * would hand it out AND approve it on nothing more than financialEntry.create
 * — a control the advance screens exist to enforce.
 *
 * The Financial Entry screen links to those modules instead. The generic
 * endpoint can still reach the delegates (see inferPostingPlan), which is
 * long-standing behaviour left alone rather than changed underneath existing
 * callers — but nothing new routes through it.
 */

/**
 * Salary is the one kind whose posting depends on a field: paying an employee
 * and paying a driver settle against different registers. The plan says so
 * explicitly rather than leaving it to a guard on destinationType.
 */
const salary: EntryKind = {
  key: 'SALARY',
  label: 'Salary Payment',
  description: "Pays a month's salary and settles that month's advances",
  icon: 'mdi-account-cash-outline',
  group: 'MONEY_OUT',
  fields: [
    {
      name: 'staffType',
      label: 'Who is being paid',
      type: 'select',
      required: true,
      options: [
        { label: 'Office Employee', value: 'EMPLOYEE' },
        { label: 'Driver', value: 'DRIVER' },
      ],
    },
    { name: 'employeeId', label: 'Employee', type: 'party', partyType: 'EMPLOYEE', required: true, showWhen: { field: 'staffType', equals: ['EMPLOYEE'] } },
    { name: 'driverId', label: 'Driver', type: 'party', partyType: 'DRIVER', required: true, showWhen: { field: 'staffType', equals: ['DRIVER'] } },
    { name: 'salaryPeriod', label: 'Salary Month', type: 'month', required: true, hint: 'The month being paid for, not the day it was paid' },
    fundAccountField('Paid From'),
    amountField('Amount Paid'),
    dateField('Date Paid'),
    paymentModeField,
    referenceField,
    remarksField,
  ],
  schema: z
    .object({
      ...baseSchema,
      staffType: z.enum(['EMPLOYEE', 'DRIVER']),
      employeeId: uuid.optional(),
      driverId: uuid.optional(),
      salaryPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Salary month must be YYYY-MM'),
      fundAccountKey: fundAccountKeySchema,
    })
    .refine((f) => (f.staffType === 'EMPLOYEE' ? !!f.employeeId : !!f.driverId), {
      message: 'Choose who is being paid',
      path: ['employeeId'],
    }),
  toEntry(f) {
    const account = splitFundAccountKey(f.fundAccountKey as string);
    const isEmployee = f.staffType === 'EMPLOYEE';
    return {
      entryType: 'SALARY_SETTLEMENT',
      purpose: 'SALARY',
      sourceType: account.type,
      sourceId: account.id,
      destinationType: isEmployee ? 'EMPLOYEE' : 'DRIVER',
      destinationId: (isEmployee ? f.employeeId : f.driverId) as string,
      salaryPeriod: f.salaryPeriod as string,
      ...baseEntryFields(f),
    } as never;
  },
  plan: (f) => ({
    post: 'DELEGATE',
    delegate: f.staffType === 'EMPLOYEE' ? 'EMPLOYEE_SALARY_PAYMENT' : 'DRIVER_SALARY_PAYMENT',
  }),
};

/**
 * Every running cost of a truck. One kind rather than six, because they differ
 * only in which purpose they carry and which Fleet record they mirror into —
 * and the operator thinks "I paid for something on this lorry", not "I am
 * making a MONEY_PAID entry with purpose REPAIR".
 */
const vehicleExpense: EntryKind = {
  key: 'VEHICLE_EXPENSE',
  label: 'Vehicle Expense',
  description: 'Fuel, AdBlue, toll, repair, insurance or tyres for one truck',
  icon: 'mdi-truck-cargo-container',
  group: 'MONEY_OUT',
  fields: [
    { name: 'vehicleId', label: 'Vehicle', type: 'party', partyType: 'VEHICLE', required: true },
    {
      name: 'expenseType',
      label: 'Expense Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Fuel / Diesel', value: 'FUEL' },
        { label: 'AdBlue', value: 'ADBLUE' },
        { label: 'Toll', value: 'TOLL' },
        { label: 'Repair', value: 'REPAIR' },
        { label: 'Insurance', value: 'INSURANCE' },
        { label: 'Other', value: 'OTHER' },
      ],
    },
    fundAccountField('Paid From'),
    amountField('Amount Paid'),
    dateField('Date Paid'),
    // Fleet linkage. Only meaningful for fuel and AdBlue, and optional even
    // then — the entry posts as a plain expense either way.
    { name: 'quantityLiters', label: 'Litres', type: 'number', showWhen: { field: 'expenseType', equals: ['FUEL', 'ADBLUE'] } },
    { name: 'ratePerLiter', label: 'Rate per Litre', type: 'number', showWhen: { field: 'expenseType', equals: ['FUEL', 'ADBLUE'] } },
    {
      name: 'odometerReading',
      label: 'Odometer',
      type: 'number',
      hint: 'Fills the Fleet fuel record and its mileage',
      showWhen: { field: 'expenseType', equals: ['FUEL', 'ADBLUE'] },
    },
    paymentModeField,
    referenceField,
    remarksField,
  ],
  schema: z.object({
    ...baseSchema,
    vehicleId: uuid,
    expenseType: z.enum(['FUEL', 'ADBLUE', 'TOLL', 'REPAIR', 'INSURANCE', 'OTHER']),
    fundAccountKey: fundAccountKeySchema,
    quantityLiters: z.number().positive().optional(),
    ratePerLiter: z.number().positive().optional(),
    odometerReading: z.number().int().positive().optional(),
  }),
  toEntry(f) {
    const account = splitFundAccountKey(f.fundAccountKey as string);
    return {
      entryType: 'EXPENSE',
      purpose: f.expenseType as string,
      sourceType: account.type,
      sourceId: account.id,
      destinationType: 'VEHICLE',
      destinationId: f.vehicleId as string,
      vehicleId: f.vehicleId as string,
      quantityLiters: f.quantityLiters as number | undefined,
      ratePerLiter: f.ratePerLiter as number | undefined,
      odometerReading: f.odometerReading as number | undefined,
      ...baseEntryFields(f),
    } as never;
  },
  plan: () => ({ post: 'FUND_MOVEMENT' }),
};

const officeExpense: EntryKind = {
  key: 'OFFICE_EXPENSE',
  label: 'Office Expense',
  description: 'Rent, stationery, utilities and other running costs',
  icon: 'mdi-office-building-outline',
  group: 'MONEY_OUT',
  fields: [
    { name: 'partyLabel', label: 'Paid To', type: 'text', required: true, placeholder: 'Who received the money' },
    fundAccountField('Paid From'),
    amountField('Amount Paid'),
    dateField('Date Paid'),
    paymentModeField,
    referenceField,
    remarksField,
  ],
  schema: z.object({ ...baseSchema, partyLabel: z.string().min(1, 'Say who was paid'), fundAccountKey: fundAccountKeySchema }),
  toEntry(f) {
    const account = splitFundAccountKey(f.fundAccountKey as string);
    return {
      entryType: 'EXPENSE',
      purpose: 'OFFICE_EXPENSE',
      sourceType: account.type,
      sourceId: account.id,
      destinationType: 'OTHER',
      destinationLabel: f.partyLabel as string,
      ...baseEntryFields(f),
    } as never;
  },
  plan: () => ({ post: 'FUND_MOVEMENT' }),
};

const otherExpense: EntryKind = {
  ...officeExpense,
  key: 'OTHER_EXPENSE',
  label: 'Other Expense',
  description: 'Anything else paid out that none of the above covers',
  icon: 'mdi-dots-horizontal',
  toEntry(f) {
    const account = splitFundAccountKey(f.fundAccountKey as string);
    return {
      entryType: 'EXPENSE',
      purpose: 'OTHER',
      sourceType: account.type,
      sourceId: account.id,
      destinationType: 'OTHER',
      destinationLabel: f.partyLabel as string,
      ...baseEntryFields(f),
    } as never;
  },
};

// --------------------------------------------------------------- transfer

const bankCashTransfer: EntryKind = {
  key: 'BANK_CASH_TRANSFER',
  label: 'Bank ↔ Cash',
  description: 'Moving your own money between a bank account and the cash box',
  icon: 'mdi-bank-transfer',
  group: 'TRANSFER',
  fields: [
    fundAccountField('From Account'),
    { name: 'toFundAccountKey', label: 'To Account', type: 'fundAccount', required: true },
    amountField('Amount'),
    dateField('Date'),
    referenceField,
    remarksField,
  ],
  schema: z
    .object({
      ...baseSchema,
      fundAccountKey: fundAccountKeySchema,
      toFundAccountKey: fundAccountKeySchema,
    })
    .refine((f) => f.fundAccountKey !== f.toFundAccountKey, {
      message: 'The two accounts must be different',
      path: ['toFundAccountKey'],
    }),
  toEntry(f) {
    const from = splitFundAccountKey(f.fundAccountKey as string);
    const to = splitFundAccountKey(f.toFundAccountKey as string);
    return {
      entryType: 'MONEY_TRANSFER',
      purpose: 'OTHER',
      sourceType: from.type,
      sourceId: from.id,
      destinationType: to.type,
      destinationId: to.id,
      ...baseEntryFields(f),
    } as never;
  },
  plan: () => ({ post: 'DELEGATE', delegate: 'BANK_TRANSFER' }),
};

// ---------------------------------------------------------------- registry

export const ENTRY_KINDS: EntryKind[] = [
  clientPayment,
  customerAdvance,
  supplierRefund,
  loanReceived,
  otherIncome,
  supplierPayment,
  vehicleExpense,
  officeExpense,
  salary,
  loanEmi,
  customerRefund,
  otherExpense,
  bankCashTransfer,
];

const BY_KEY = new Map(ENTRY_KINDS.map((k) => [k.key, k]));

export function findEntryKind(key: string): EntryKind | undefined {
  return BY_KEY.get(key);
}

/** What the frontend renders its picker and forms from — no schema, no functions. */
export function entryKindCatalogue() {
  return ENTRY_KINDS.map((k) => ({
    key: k.key,
    label: k.label,
    description: k.description,
    icon: k.icon,
    group: k.group,
    fields: k.fields,
  }));
}
