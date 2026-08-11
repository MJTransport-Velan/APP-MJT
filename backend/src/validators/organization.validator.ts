import { z } from 'zod';
import { gstRegex, panRegex, tanRegex } from './common.patterns';

export const listOrganizationsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const organizationIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid organization id') }),
});

export const createOrganizationSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    code: z.string().min(1, 'Organization code is required').toUpperCase(),
    name: z.string().min(1, 'Organization name is required'),
    gstNumber: z.string().regex(gstRegex, 'Invalid GST number').optional(),
    panNumber: z.string().regex(panRegex, 'Invalid PAN number').optional(),
    tanNumber: z.string().regex(tanRegex, 'Invalid TAN number').optional(),
    address: z.string().optional(),
  }),
});

export const updateOrganizationSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid organization id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    gstNumber: z.string().regex(gstRegex, 'Invalid GST number').optional(),
    panNumber: z.string().regex(panRegex, 'Invalid PAN number').optional(),
    tanNumber: z.string().regex(tanRegex, 'Invalid TAN number').optional(),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>['body'];
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>['body'];
