import { z } from 'zod';

export const listGroupsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const groupIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid group id'),
  }),
});

export const createGroupSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(2, 'Group name must be at least 2 characters'),
    description: z.string().optional(),
  }),
});

export const updateGroupSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid group id'),
  }),
  body: z.object({
    name: z.string().min(2, 'Group name must be at least 2 characters').optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const assignGroupMembersSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid group id'),
  }),
  body: z.object({
    userIds: z.array(z.string().uuid()),
  }),
});

export const removeGroupMemberSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid group id'),
    userId: z.string().uuid('Invalid user id'),
  }),
});

export const assignGroupCompaniesSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid group id'),
  }),
  body: z.object({
    companyIds: z.array(z.string().uuid()),
  }),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>['body'];
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>['body'];
export type AssignGroupMembersInput = z.infer<typeof assignGroupMembersSchema>['body'];
export type AssignGroupCompaniesInput = z.infer<typeof assignGroupCompaniesSchema>['body'];
