import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email').optional(),
    fullName: z.string().min(1, 'Full name is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    roleIds: z.array(z.string().uuid()).optional().default([]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email').optional(),
    fullName: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    roleIds: z.array(z.string().uuid()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid user id'),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
