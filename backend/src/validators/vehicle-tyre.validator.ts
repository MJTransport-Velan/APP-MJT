import { z } from 'zod';

export const listVehicleTyresSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    status: z.enum(['INSTALLED', 'REMOVED', 'SCRAPPED']).optional(),
  }),
});

export const vehicleTyreIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid tyre id') }),
});

export const installTyreSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    tyreId: z.string().uuid('A valid tyre catalog entry is required'),
    vehicleId: z.string().uuid('A valid vehicle is required'),
    serialNumber: z.string().optional(),
    position: z.string().optional(),
    installedDate: z.string().optional(),
    installedOdometer: z.number().int().min(0).optional(),
    cost: z.number().min(0).optional(),
  }),
});

export const rotateTyreSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid tyre id') }),
  body: z.object({
    toVehicleId: z.string().uuid().optional(),
    toPosition: z.string().optional(),
    odometerReading: z.number().int().min(0).optional(),
  }),
});

export const removeTyreSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid tyre id') }),
  body: z.object({
    removedDate: z.string().optional(),
    removedOdometer: z.number().int().min(0).optional(),
  }),
});

export type InstallTyreInput = z.infer<typeof installTyreSchema>['body'];
export type RotateTyreInput = z.infer<typeof rotateTyreSchema>['body'];
export type RemoveTyreInput = z.infer<typeof removeTyreSchema>['body'];
