import { z } from 'zod';

const cashAccountTypeEnum = z.enum(['MAIN', 'PETTY', 'BRANCH', 'SITE', 'EMERGENCY']);

export const listCashAccountsSchema = z.object({
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

export const cashAccountIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
});

export const createCashAccountSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    organizationId: z.string().uuid().optional(),
    cashAccountType: cashAccountTypeEnum.optional(),
    responsiblePersonId: z.string().uuid().optional(),
    openingBalance: z.number().optional(),
    maximumLimit: z.number().min(0).optional(),
    approvalLimit: z.number().min(0).optional(),
  }),
});

export const updateCashAccountSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
  body: z.object({
    cashAccountType: cashAccountTypeEnum.optional(),
    responsiblePersonId: z.string().uuid().nullable().optional(),
    maximumLimit: z.number().min(0).nullable().optional(),
    approvalLimit: z.number().min(0).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateCashAccountInput = z.infer<typeof createCashAccountSchema>['body'];
export type UpdateCashAccountInput = z.infer<typeof updateCashAccountSchema>['body'];
