import { z } from 'zod';

export const listBranchesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    companyId: z.string().uuid().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const branchIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid branch id') }),
});

export const createBranchSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    companyId: z.string().uuid('A valid company is required'),
    name: z.string().min(1, 'Branch name is required'),
    code: z.string().min(1, 'Branch code is required').toUpperCase(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').optional(),
  }),
});

export const updateBranchSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid branch id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).toUpperCase().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>['body'];
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>['body'];
