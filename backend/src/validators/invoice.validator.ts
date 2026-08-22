import { z } from 'zod';

const invoiceChargeTypeEnum = z.enum(['FUEL_RECOVERY', 'DETENTION', 'LOADING', 'UNLOADING', 'DISCOUNT', 'ROUND_OFF', 'OTHER']);
const creditNoteCategoryEnum = z.enum(['RATE_DIFFERENCE', 'SERVICE_CANCELLATION', 'DAMAGE', 'SHORT_DELIVERY', 'DISCOUNT', 'BILLING_CORRECTION', 'OTHER']);
const debitNoteCategoryEnum = z.enum(['ADDITIONAL_CHARGES', 'PENALTY', 'INTEREST', 'FUEL_DIFFERENCE', 'SHORT_COLLECTION', 'OTHER']);

export const listInvoicesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    companyId: z.string().uuid().optional(),
    status: z.enum(['DRAFT', 'GENERATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']).optional(),
  }),
});

export const invoiceIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid invoice id') }),
});

export const generateInvoiceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    companyId: z.string().uuid('A valid company is required'),
    tripIds: z.array(z.string().uuid()).min(1, 'At least one completed trip is required'),
    gstMasterId: z.string().uuid().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    overrideCreditHold: z.boolean().optional(),
    charges: z
      .array(
        z.object({
          chargeType: invoiceChargeTypeEnum,
          description: z.string().optional(),
          amount: z.number(),
        })
      )
      .optional(),
  }).strict(),
});

export const updateInvoiceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid invoice id') }),
  body: z.object({
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  }).strict(),
});

export const createCreditNoteSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid invoice id') }),
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    reason: z.string().min(1, 'A reason is required'),
    category: creditNoteCategoryEnum.optional(),
  }).strict(),
});

export const createDebitNoteSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid invoice id') }),
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    reason: z.string().min(1, 'A reason is required'),
    category: debitNoteCategoryEnum.optional(),
  }).strict(),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>['body'];
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>['body'];
export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>['body'];
export type CreateDebitNoteInput = z.infer<typeof createDebitNoteSchema>['body'];
