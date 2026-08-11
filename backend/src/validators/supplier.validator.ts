import { z } from 'zod';
import { gstRegex, panRegex, indianMobileRegex } from './common.patterns';

export const listSuppliersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const supplierIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid supplier id') }),
});

export const createSupplierSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(1, 'Supplier name is required'),
    code: z.string().min(1, 'Supplier code is required').toUpperCase(),
    gstNumber: z.string().regex(gstRegex, 'Invalid GST number').optional(),
    panNumber: z.string().regex(panRegex, 'Invalid PAN number').optional(),
    contactPerson: z.string().optional(),
    phone: z.string().regex(indianMobileRegex, 'Phone must be a valid 10-digit number').optional(),
    email: z.string().email('Invalid email').optional(),
    address: z.string().optional(),
  }),
});

export const updateSupplierSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid supplier id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).toUpperCase().optional(),
    gstNumber: z.string().regex(gstRegex, 'Invalid GST number').optional(),
    panNumber: z.string().regex(panRegex, 'Invalid PAN number').optional(),
    contactPerson: z.string().optional(),
    phone: z.string().regex(indianMobileRegex, 'Phone must be a valid 10-digit number').optional(),
    email: z.string().email('Invalid email').optional(),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>['body'];
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>['body'];
