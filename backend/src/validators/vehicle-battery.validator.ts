import { z } from 'zod';

export const listVehicleBatteriesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    status: z.enum(['INSTALLED', 'REPLACED', 'DISPOSED']).optional(),
  }),
});

export const vehicleBatteryIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid battery id') }),
});

export const installBatterySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    brand: z.string().min(1, 'Brand is required'),
    serialNumber: z.string().optional(),
    installedDate: z.string().optional(),
    installedOdometer: z.number().int().min(0).optional(),
    warrantyMonths: z.number().int().min(0).optional(),
    cost: z.number().min(0).optional(),
    replacesBatteryId: z.string().uuid().optional(),
  }),
});

export type InstallBatteryInput = z.infer<typeof installBatterySchema>['body'];
