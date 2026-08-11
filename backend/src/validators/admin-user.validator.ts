import { z } from 'zod';

export const listAdminUsersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
    roleId: z.string().uuid().optional(),
    teamId: z.string().uuid().optional(),
  }),
});

export const userIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid user id'),
  }),
});

export const createAdminUserSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email').optional(),
    phone: z.string().optional(),
    fullName: z.string().min(1, 'Full name is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    roleIds: z.array(z.string().uuid()).optional().default([]),
    teamIds: z.array(z.string().uuid()).optional().default([]),
  }),
});

export const updateAdminUserSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid user id'),
  }),
  body: z.object({
    email: z.string().email('Invalid email').optional(),
    phone: z.string().optional(),
    fullName: z.string().min(1).optional(),
    roleIds: z.array(z.string().uuid()).optional(),
    teamIds: z.array(z.string().uuid()).optional(),
  }),
});

export const resetPasswordSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid user id'),
  }),
  body: z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>['body'];
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>['body'];
