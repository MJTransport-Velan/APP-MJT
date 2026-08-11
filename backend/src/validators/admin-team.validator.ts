import { z } from 'zod';

export const listTeamsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    departmentId: z.string().uuid().optional(),
  }),
});

export const teamIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid team id'),
  }),
});

export const createTeamSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(2, 'Team name must be at least 2 characters'),
    departmentId: z.string().uuid('A valid department is required'),
    description: z.string().optional(),
  }),
});

export const updateTeamSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid team id'),
  }),
  body: z.object({
    name: z.string().min(2, 'Team name must be at least 2 characters').optional(),
    departmentId: z.string().uuid().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const assignTeamMembersSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid team id'),
  }),
  body: z.object({
    userIds: z.array(z.string().uuid()),
  }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>['body'];
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>['body'];
export type AssignTeamMembersInput = z.infer<typeof assignTeamMembersSchema>['body'];
