import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const isoMonth = z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format');

export const financialEntryTypeEnum = z.enum([
  'MONEY_RECEIVED',
  'MONEY_PAID',
  'MONEY_TRANSFER',
  'EXPENSE',
  'ADVANCE_RECEIVED',
  'ADVANCE_GIVEN',
  'REFUND_RECEIVED',
  'REFUND_PAID',
  'LOAN_RECEIVED',
  'LOAN_REPAYMENT',
  'SALARY_SETTLEMENT',
  'ADJUSTMENT',
]);

export const financialPartyTypeEnum = z.enum([
  'CUSTOMER',
  'SUPPLIER',
  'DRIVER',
  'EMPLOYEE',
  'BANK',
  'CASH',
  'LOAN_PROVIDER',
  'VEHICLE',
  'TRIP',
  'EXPENSE',
  'OTHER',
]);

export const financialEntryPurposeEnum = z.enum([
  'TRIP_ADVANCE',
  'TRIP_PAYMENT',
  'SUPPLIER_PAYMENT',
  'CLIENT_PAYMENT',
  'DRIVER_ADVANCE',
  'SALARY',
  'FUEL',
  'REPAIR',
  'INSURANCE',
  'LOAN_EMI',
  'CUSTOMER_REFUND',
  'SUPPLIER_REFUND',
  'OFFICE_EXPENSE',
  'TOLL',
  'OTHER',
]);

export const listFinancialEntriesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    // Single type ("MONEY_RECEIVED") or a comma-separated group
    // ("MONEY_RECEIVED,ADVANCE_RECEIVED,...") — the latter is how the
    // Financial Entry page's Money In / Money Out stat cards filter the
    // list to the same entryType set financial-state.service.ts's
    // dashboard() sums for that card.
    entryType: z
      .string()
      .optional()
      .refine((v) => !v || v.split(',').every((t) => financialEntryTypeEnum.options.includes(t as never)), 'Invalid entry type filter'),
    status: z.enum(['DRAFT', 'COMPLETED', 'CANCELLED', 'REVERSED']).optional(),
    sourceType: financialPartyTypeEnum.optional(),
    sourceId: z.string().uuid().optional(),
    destinationType: financialPartyTypeEnum.optional(),
    destinationId: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }),
});

export const financialEntryIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid entry id') }),
});

export const createFinancialEntrySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z
    .object({
      organizationId: z.string().uuid().optional(),
      entryType: financialEntryTypeEnum,
      entryDate: isoDate,
      sourceType: financialPartyTypeEnum,
      sourceId: z.string().uuid().optional(),
      sourceLabel: z.string().optional(),
      destinationType: financialPartyTypeEnum,
      destinationId: z.string().uuid().optional(),
      destinationLabel: z.string().optional(),
      amount: z.number().positive('Amount must be greater than 0'),
      paymentModeId: z.string().uuid().optional(),
      referenceNumber: z.string().optional(),
      remarks: z.string().optional(),
      purpose: financialEntryPurposeEnum.default('OTHER'),
      purposeNotes: z.string().optional(),
      // Which calendar month this salary payment covers (Financial Entry's
      // "Salary Entry" toggle) — distinct from entryDate, which is when it
      // was actually paid (e.g. August salary paid on Sept 5). Only
      // meaningful when purpose=SALARY; falls back to entryDate's own
      // month when omitted (financial-entry.service.ts delegateToEmployee/
      // DriverSalaryPayment).
      salaryPeriod: isoMonth.optional(),
      // Optional Fleet-module linkage — only used when purpose is FUEL
      // (all three fuel fields present) or TOLL (vehicleId present); see
      // maybeLinkFleetRecords() in financial-entry.service.ts. Harmless to
      // omit — the entry still posts as a plain expense either way.
      vehicleId: z.string().uuid().optional(),
      tripId: z.string().uuid().optional(),
      quantityLiters: z.number().positive().optional(),
      ratePerLiter: z.number().positive().optional(),
      odometerReading: z.number().int().positive().optional(),
    })
    .refine((v) => v.sourceId || v.sourceLabel, { message: 'A source must be selected or named', path: ['sourceId'] })
    .refine((v) => v.destinationId || v.destinationLabel, { message: 'A destination must be selected or named', path: ['destinationId'] }),
});

export const cancelFinancialEntrySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid entry id') }),
  body: z.object({ reason: z.string().min(1, 'A cancellation reason is required') }),
});

export const reverseFinancialEntrySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid entry id') }),
  body: z.object({ reason: z.string().optional() }),
});

export const correctFinancialEntrySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid entry id') }),
  body: createFinancialEntrySchema.shape.body,
});

export type CreateFinancialEntryInput = z.infer<typeof createFinancialEntrySchema>['body'];
