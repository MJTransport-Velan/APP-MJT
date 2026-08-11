import { z } from 'zod';

export const listDepartmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const departmentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid department id'),
  }),
});

export const createDepartmentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(2, 'Department name must be at least 2 characters'),
    description: z.string().optional(),
  }),
});

export const updateDepartmentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid department id'),
  }),
  body: z.object({
    name: z.string().min(2, 'Department name must be at least 2 characters').optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>['body'];
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>['body'];
