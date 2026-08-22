import { z } from 'zod';

const fundAccountTypeEnum = z.enum(['BANK', 'CASH']);

export const listReceiptsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    companyId: z.string().uuid().optional(),
    invoiceId: z.string().uuid().optional(),
    isAdvance: z.enum(['true', 'false']).optional(),
  }),
});

export const receiptIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid receipt id') }),
});

export const createReceiptSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    companyId: z.string().uuid('A valid company is required'),
    invoiceId: z.string().uuid().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    receiptDate: z.string().optional(),
    paymentModeId: z.string().uuid().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
    // Optional at the API boundary so pre-existing internal callers (e.g.
    // Trip allocation's client-advance shortcut, Phase 5) keep working —
    // receiptService falls back to the organization's default Cash Account
    // when omitted, rather than making every caller pass one (§ receipt.service.ts).
    fundAccountType: fundAccountTypeEnum.optional(),
    fundAccountId: z.string().uuid().optional(),
    chequeId: z.string().uuid().optional(),
  }).strict(),
});

export const updateReceiptSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid receipt id') }),
  body: z.object({
    amount: z.number().positive().optional(),
    receiptDate: z.string().optional(),
    paymentModeId: z.string().uuid().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
  }).strict(),
});

export const allocateReceiptSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid receipt id') }),
  body: z.object({
    invoiceId: z.string().uuid('A valid invoice is required'),
  }),
});

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>['body'];
export type UpdateReceiptInput = z.infer<typeof updateReceiptSchema>['body'];
