import { z } from 'zod';

export const listRoutesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    fromLocationId: z.string().uuid().optional(),
    toLocationId: z.string().uuid().optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const routeIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid route id') }),
});

export const createRouteSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z
    .object({
      name: z.string().min(1, 'Route name is required'),
      code: z.string().min(1, 'Route code is required').toUpperCase(),
      fromLocationId: z.string().uuid('A valid origin location is required'),
      toLocationId: z.string().uuid('A valid destination location is required'),
      distanceKm: z.number().positive('Distance must be greater than 0').optional(),
    })
    .refine((data) => data.fromLocationId !== data.toLocationId, {
      message: 'Origin and destination locations must be different',
      path: ['toLocationId'],
    }),
});

export const updateRouteSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid route id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).toUpperCase().optional(),
    fromLocationId: z.string().uuid().optional(),
    toLocationId: z.string().uuid().optional(),
    distanceKm: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>['body'];
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>['body'];
