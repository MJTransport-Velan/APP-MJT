import { z } from 'zod';

export const listVehiclesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    vehicleTypeId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    ownership: z.enum(['OWN', 'MARKET']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const vehicleIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid vehicle id') }),
});

export const createVehicleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    registrationNumber: z
      .string()
      .min(4, 'Registration number is required')
      .toUpperCase(),
    vehicleTypeId: z.string().uuid('A valid vehicle type is required'),
    ownership: z.enum(['OWN', 'MARKET']).default('OWN'),
    supplierId: z.string().uuid().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    capacityTon: z.number().positive().optional(),
  }),
});

export const updateVehicleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid vehicle id') }),
  body: z.object({
    vehicleTypeId: z.string().uuid().optional(),
    ownership: z.enum(['OWN', 'MARKET']).optional(),
    supplierId: z.string().uuid().nullable().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    capacityTon: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>['body'];
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>['body'];
