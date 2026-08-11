import { z } from 'zod';
import { gstRegex, panRegex } from './common.patterns';

export const listCompaniesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const companyIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid company id'),
  }),
});

export const createCompanySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(2, 'Company name must be at least 2 characters'),
    code: z.string().min(2, 'Company code must be at least 2 characters').toUpperCase(),
    groupId: z.string().uuid('A group is required'),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').optional(),
    address: z.string().optional(),
    gstNumber: z.string().regex(gstRegex, 'Invalid GST number').optional(),
    panNumber: z.string().regex(panRegex, 'Invalid PAN number').optional(),
  }),
});

export const updateCompanySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid company id'),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    groupId: z.string().uuid('Invalid group id').optional(),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').optional(),
    address: z.string().optional(),
    gstNumber: z.string().regex(gstRegex, 'Invalid GST number').optional(),
    panNumber: z.string().regex(panRegex, 'Invalid PAN number').optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>['body'];
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>['body'];
