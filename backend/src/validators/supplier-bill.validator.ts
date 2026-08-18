import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').or(z.string());
const supplierCreditNoteCategoryEnum = z.enum(['BILL_CORRECTION', 'RATE_REVISION', 'DISCOUNT', 'ADJUSTMENT', 'REFUND', 'OTHER']);
const supplierDebitNoteCategoryEnum = z.enum(['DAMAGE_RECOVERY', 'PENALTY', 'SHORT_DELIVERY', 'QUALITY_ISSUE', 'FUEL_RECOVERY', 'COMMISSION_RECOVERY', 'OTHER']);

export const listSupplierBillsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    status: z.enum(['DRAFT', 'GENERATED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']).optional(),
    unpaidOnly: z.enum(['true', 'false']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }),
});

export const supplierBillIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid bill id') }),
});

export const generateSupplierBillSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    supplierId: z.string().uuid('A valid supplier is required'),
    tripId: z.string().uuid().optional(),
    subtotal: z.number().positive('Subtotal must be greater than 0').optional(),
    taxAmount: z.number().min(0).optional(),
    retentionAmount: z.number().min(0).optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateSupplierBillSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid bill id') }),
  body: z.object({
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const createSupplierCreditNoteSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid bill id') }),
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    reason: z.string().min(1, 'A reason is required'),
    category: supplierCreditNoteCategoryEnum.optional(),
  }),
});

export const createSupplierDebitNoteSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid bill id') }),
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    reason: z.string().min(1, 'A reason is required'),
    category: supplierDebitNoteCategoryEnum.optional(),
  }),
});

export type GenerateSupplierBillInput = z.infer<typeof generateSupplierBillSchema>['body'];
export type UpdateSupplierBillInput = z.infer<typeof updateSupplierBillSchema>['body'];
export type CreateSupplierCreditNoteInput = z.infer<typeof createSupplierCreditNoteSchema>['body'];
export type CreateSupplierDebitNoteInput = z.infer<typeof createSupplierDebitNoteSchema>['body'];
