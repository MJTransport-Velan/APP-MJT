import { z } from 'zod';

export const listUsageSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    sparePartId: z.string().uuid().optional(),
    type: z.enum(['ISSUE', 'RETURN']).optional(),
  }),
});

export const usageIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid usage id') }),
});

export const createUsageSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    sparePartId: z.string().uuid('A valid spare part is required'),
    maintenanceRecordId: z.string().uuid().optional(),
    type: z.enum(['ISSUE', 'RETURN']),
    quantity: z.number().int().positive('Quantity must be greater than 0'),
    usageDate: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export type CreateUsageInput = z.infer<typeof createUsageSchema>['body'];
