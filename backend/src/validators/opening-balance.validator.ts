import { z } from 'zod';

/**
 * Opening Balance & Migration (Phase 18). Which link field a row needs is
 * decided by its category and enforced in the service, where the linked
 * record is looked up anyway — the same pattern every other polymorphic
 * link in this app follows.
 */
export const openingBalanceCategoryEnum = z.enum([
  'BANK',
  'CASH',
  'RECEIVABLE',
  'PAYABLE',
  'OWNER_FUNDS',
  'OTHER_ASSET',
  'OTHER_LIABILITY',
  'OTHER_EQUITY',
]);

export const openingFundClassificationEnum = z.enum(['CAPITAL', 'OWNER_LOAN', 'OTHER_LIABILITY', 'UNCLASSIFIED']);
export const migrationRecordStatusEnum = z.enum(['CONFIRMED', 'NEEDS_REVIEW', 'UNVERIFIED', 'RECLASSIFIED']);

const dateString = z.string().min(1);

export const saveMigrationSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z
    .object({
      migrationDate: dateString,
      previousSystem: z.string().min(1).optional(),
      previousClosingDate: z.string().optional(),
      notes: z.string().optional(),
    })
    .strict(),
});

export const listOpeningBalancesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    category: openingBalanceCategoryEnum.optional(),
    status: migrationRecordStatusEnum.optional(),
    search: z.string().optional(),
  }),
});

export const openingBalanceIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid opening balance id') }),
});

const entryBody = {
  category: openingBalanceCategoryEnum,
  amount: z.number().refine((n) => Math.abs(n) > 0, 'Amount is required'),
  bankAccountId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  capitalPartnerId: z.string().uuid().optional(),
  label: z.string().optional(),
  classification: openingFundClassificationEnum.optional(),
  status: migrationRecordStatusEnum.optional(),
  source: z.string().optional(),
  referenceNumber: z.string().optional(),
  referenceDate: z.string().optional(),
  remarks: z.string().optional(),
};

export const createOpeningBalanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object(entryBody).strict(),
});

export const updateOpeningBalanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid opening balance id') }),
  body: z
    .object({
      amount: z.number().optional(),
      label: z.string().nullable().optional(),
      classification: openingFundClassificationEnum.optional(),
      status: migrationRecordStatusEnum.optional(),
      source: z.string().optional(),
      referenceNumber: z.string().nullable().optional(),
      referenceDate: z.string().nullable().optional(),
      remarks: z.string().nullable().optional(),
    })
    .strict()
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' }),
});

export const reclassifyOpeningBalanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid opening balance id') }),
  body: z
    .object({
      classification: openingFundClassificationEnum,
      remarks: z.string().optional(),
    })
    .strict(),
});

export const setOpeningBalanceStatusSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid opening balance id') }),
  body: z.object({ status: migrationRecordStatusEnum }).strict(),
});

export const emptyBodySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export type SaveMigrationInput = z.infer<typeof saveMigrationSchema>['body'];
export type CreateOpeningBalanceInput = z.infer<typeof createOpeningBalanceSchema>['body'];
export type UpdateOpeningBalanceInput = z.infer<typeof updateOpeningBalanceSchema>['body'];
export type ReclassifyOpeningBalanceInput = z.infer<typeof reclassifyOpeningBalanceSchema>['body'];
export type OpeningBalanceCategoryValue = z.infer<typeof openingBalanceCategoryEnum>;
export type MigrationRecordStatusValue = z.infer<typeof migrationRecordStatusEnum>;
export type OpeningFundClassificationValue = z.infer<typeof openingFundClassificationEnum>;
