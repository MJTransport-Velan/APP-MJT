import { z } from 'zod';

export const listAdminRolesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const roleIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid role id'),
  }),
});

export const createRoleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(3, 'Role name must be at least 3 characters').toUpperCase(),
    description: z.string().optional(),
    permissionIds: z.array(z.string().uuid()).optional().default([]),
  }),
});

export const updateRoleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid role id'),
  }),
  body: z.object({
    name: z.string().min(3, 'Role name must be at least 3 characters').toUpperCase().optional(),
    description: z.string().optional(),
  }),
});

export const cloneRoleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid role id'),
  }),
  body: z.object({
    name: z.string().min(3, 'Role name must be at least 3 characters').toUpperCase(),
    description: z.string().optional(),
  }),
});

export const assignPermissionsSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid role id'),
  }),
  body: z.object({
    permissionIds: z.array(z.string().uuid()),
  }),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>['body'];
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>['body'];
export type CloneRoleInput = z.infer<typeof cloneRoleSchema>['body'];
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>['body'];
