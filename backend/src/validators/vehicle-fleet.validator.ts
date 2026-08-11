import { z } from 'zod';

export const vehicleIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid vehicle id') }),
});

export const updateVehicleStatusSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid vehicle id') }),
  body: z.object({
    status: z.enum(['AVAILABLE', 'RUNNING', 'UNDER_MAINTENANCE', 'INACTIVE']),
  }),
});

export const updateComplianceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid vehicle id') }),
  body: z.object({
    fastagNumber: z.string().optional(),
    gpsDeviceNumber: z.string().optional(),
    rcExpiryDate: z.string().optional(),
    insuranceExpiryDate: z.string().optional(),
    permitExpiryDate: z.string().optional(),
    fitnessExpiryDate: z.string().optional(),
    pucExpiryDate: z.string().optional(),
  }),
});

export type UpdateVehicleStatusInput = z.infer<typeof updateVehicleStatusSchema>['body'];
export type UpdateComplianceInput = z.infer<typeof updateComplianceSchema>['body'];
