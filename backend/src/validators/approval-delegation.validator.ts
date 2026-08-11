import { z } from 'zod';

export const createApprovalDelegationSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    fromUserId: z.string().uuid('A valid delegating user is required'),
    toUserId: z.string().uuid('A valid substitute user is required'),
    fromDate: z.string().min(1, 'fromDate is required'),
    toDate: z.string().min(1, 'toDate is required'),
    reason: z.string().optional(),
  }),
});

export const approvalDelegationIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid delegation id') }),
});

export type CreateApprovalDelegationInput = z.infer<typeof createApprovalDelegationSchema>['body'];
