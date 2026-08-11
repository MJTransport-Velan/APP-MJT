import { z } from 'zod';

const fundAccountTypeEnum = z.enum(['BANK', 'CASH']);

export const listSupplierPaymentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    tripId: z.string().uuid().optional(),
    billId: z.string().uuid().optional(),
    isAdvance: z.enum(['true', 'false']).optional(),
  }),
});

export const supplierPaymentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid payment id') }),
});

export const createSupplierPaymentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    supplierId: z.string().uuid('A valid supplier is required'),
    tripId: z.string().uuid().optional(),
    billId: z.string().uuid().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    paymentDate: z.string().optional(),
    paymentModeId: z.string().uuid().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
    // Optional at the API boundary — same reasoning as receipt.validator.ts.
    fundAccountType: fundAccountTypeEnum.optional(),
    fundAccountId: z.string().uuid().optional(),
    chequeId: z.string().uuid().optional(),
    isRetentionRelease: z.boolean().optional(),
  }),
});

export const updateSupplierPaymentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid payment id') }),
  body: z.object({
    amount: z.number().positive().optional(),
    paymentDate: z.string().optional(),
    paymentModeId: z.string().uuid().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

export type CreateSupplierPaymentInput = z.infer<typeof createSupplierPaymentSchema>['body'];
export type UpdateSupplierPaymentInput = z.infer<typeof updateSupplierPaymentSchema>['body'];
