import { z } from 'zod';

export const listAssignmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  }),
});

export const assignmentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid assignment id') }),
});

export const createAssignmentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    driverId: z.string().uuid('A valid driver is required'),
    notes: z.string().optional(),
  }),
});

export const completeAssignmentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid assignment id') }),
  body: z.object({
    notes: z.string().optional(),
  }),
});

export const updateAssignmentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid assignment id') }),
  body: z.object({
    notes: z.string().optional(),
  }),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>['body'];
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>['body'];
