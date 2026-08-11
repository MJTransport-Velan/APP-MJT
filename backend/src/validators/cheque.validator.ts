import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const partyTypeEnum = z.enum(['CUSTOMER', 'SUPPLIER', 'DRIVER', 'EMPLOYEE', 'BANK', 'CASH', 'LOAN_PROVIDER', 'VEHICLE', 'TRIP', 'EXPENSE', 'OTHER']);

export const listChequesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    organizationId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid().optional(),
    direction: z.enum(['ISSUED', 'RECEIVED']).optional(),
    status: z
      .enum(['AVAILABLE', 'ISSUED', 'RECEIVED', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'RETURNED', 'BOUNCED', 'CANCELLED', 'STOP_PAYMENT', 'EXPIRED'])
      .optional(),
  }),
});

export const chequeIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
});

export const issueChequeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    organizationId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid('bankAccountId is required'),
    chequeBookId: z.string().uuid().optional(),
    chequeNumber: z.string().min(1, 'Cheque number is required'),
    chequeDate: isoDate,
    isPostDated: z.boolean().optional(),
    partyType: partyTypeEnum.optional(),
    partyId: z.string().uuid().optional(),
    payeeOrPayerName: z.string().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    narration: z.string().optional(),
  }),
});

export const receiveChequeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    organizationId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid('bankAccountId is required'),
    chequeNumber: z.string().min(1, 'Cheque number is required'),
    chequeDate: isoDate,
    isPostDated: z.boolean().optional(),
    partyType: partyTypeEnum.optional(),
    partyId: z.string().uuid().optional(),
    payeeOrPayerName: z.string().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    narration: z.string().optional(),
  }),
});

export const depositChequeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    depositedIntoBankAccountId: z.string().uuid().optional(),
    depositDate: isoDate.optional(),
  }),
});

export const clearChequeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    clearanceDate: isoDate.optional(),
  }),
});

export const bounceChequeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    bounceReason: z.string().min(3, 'Bounce reason is required'),
    bounceDate: isoDate.optional(),
    bounceChargeAmount: z.number().positive().optional(),
  }),
});

export const cancelChequeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    reason: z.string().min(3, 'A reason is required'),
  }),
});

export type IssueChequeInput = z.infer<typeof issueChequeSchema>['body'];
export type ReceiveChequeInput = z.infer<typeof receiveChequeSchema>['body'];
export type DepositChequeInput = z.infer<typeof depositChequeSchema>['body'];
export type ClearChequeInput = z.infer<typeof clearChequeSchema>['body'];
export type BounceChequeInput = z.infer<typeof bounceChequeSchema>['body'];
export type CancelChequeInput = z.infer<typeof cancelChequeSchema>['body'];
