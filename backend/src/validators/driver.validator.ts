import { z } from 'zod';
import { indianMobileRegex } from './common.patterns';

export const listDriversSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const driverIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid driver id') }),
});

export const createDriverSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(1, 'Driver name is required'),
    code: z.string().min(1, 'Driver code is required').toUpperCase(),
    licenseNumber: z.string().min(1, 'License number is required').toUpperCase(),
    phone: z.string().regex(indianMobileRegex, 'Phone must be a valid 10-digit number').optional(),
    licenseExpiryDate: z.string().datetime().optional().or(z.string().date().optional()),
  }),
});

export const updateDriverSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid driver id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).toUpperCase().optional(),
    licenseNumber: z.string().min(1).toUpperCase().optional(),
    phone: z.string().regex(indianMobileRegex, 'Phone must be a valid 10-digit number').optional(),
    licenseExpiryDate: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>['body'];
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>['body'];
