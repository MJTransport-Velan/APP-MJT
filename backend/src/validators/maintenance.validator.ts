import { z } from 'zod';

export const listMaintenanceSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    type: z.enum(['SERVICE', 'REPAIR', 'BREAKDOWN', 'ACCIDENT']).optional(),
    status: z.enum(['OPEN', 'COMPLETED']).optional(),
  }),
});

export const maintenanceIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid maintenance record id') }),
});

export const createMaintenanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    type: z.enum(['SERVICE', 'REPAIR', 'BREAKDOWN', 'ACCIDENT']),
    serviceCategoryId: z.string().uuid().optional(),
    description: z.string().min(1, 'Description is required'),
    serviceDate: z.string().optional(),
    cost: z.number().nonnegative().optional(),
    odometerReading: z.number().int().nonnegative().optional(),
    nextServiceDueDate: z.string().optional(),
    nextServiceDueOdometer: z.number().int().positive().optional(),
  }),
});

export const updateMaintenanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid maintenance record id') }),
  body: z.object({
    serviceCategoryId: z.string().uuid().optional(),
    description: z.string().min(1).optional(),
    serviceDate: z.string().optional(),
    cost: z.number().nonnegative().optional(),
    odometerReading: z.number().int().nonnegative().optional(),
    nextServiceDueDate: z.string().optional(),
    nextServiceDueOdometer: z.number().int().positive().optional(),
    status: z.enum(['OPEN', 'COMPLETED']).optional(),
  }),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>['body'];
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>['body'];
