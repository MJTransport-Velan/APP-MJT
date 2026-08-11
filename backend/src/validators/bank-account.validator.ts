import { z } from 'zod';

const accountTypeEnum = z.enum(['SAVINGS', 'CURRENT', 'OD', 'CC', 'FIXED_DEPOSIT']);

export const listBankAccountsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    organizationId: z.string().uuid().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const bankAccountIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
});

export const createBankAccountSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    organizationId: z.string().uuid().optional(),
    accountHolderName: z.string().min(1, 'Account holder name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    bankName: z.string().optional(),
    accountType: accountTypeEnum.optional(),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').optional(),
    micrCode: z.string().optional(),
    swiftCode: z.string().optional(),
    branchName: z.string().optional(),
    openingBalance: z.number().optional(),
    openingDate: z.string().optional(),
    isPrimary: z.boolean().optional(),
    isDefaultPaymentAccount: z.boolean().optional(),
    isDefaultReceiptAccount: z.boolean().optional(),
  }),
});

export const updateBankAccountSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    accountHolderName: z.string().min(1).optional(),
    accountNumber: z.string().min(1).optional(),
    bankName: z.string().optional(),
    accountType: accountTypeEnum.optional(),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').optional(),
    micrCode: z.string().optional(),
    swiftCode: z.string().optional(),
    branchName: z.string().optional(),
    isPrimary: z.boolean().optional(),
    isDefaultPaymentAccount: z.boolean().optional(),
    isDefaultReceiptAccount: z.boolean().optional(),
  }),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>['body'];
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>['body'];
