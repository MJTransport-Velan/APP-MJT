import { z } from 'zod';

const triggerTypeEnum = z.enum(['SCHEDULE', 'EVENT']);
const actionTypeEnum = z.enum([
  'SEND_NOTIFICATION',
  'RUN_REPORT_SCHEDULE',
  'RUN_BACKUP',
  'ARCHIVE_LOGS',
  'OUTSTANDING_REMINDER',
  'ESCALATE_APPROVALS',
  'COMPUTE_KPI_SNAPSHOTS',
  'DUPLICATE_VOUCHER_SCAN',
]);

export const createAutomationRuleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    triggerType: triggerTypeEnum,
    cronExpression: z.string().optional(),
    eventCode: z.string().optional(),
    actionType: actionTypeEnum,
    actionConfig: z.string().optional(),
  }),
});

export const updateAutomationRuleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid automation rule id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    cronExpression: z.string().optional(),
    eventCode: z.string().optional(),
    actionConfig: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const automationRuleIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid automation rule id') }),
});

export const listRunLogsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid automation rule id') }),
  query: z.object({ page: z.string().optional(), pageSize: z.string().optional() }),
});

export const fireEventSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({ eventCode: z.string().min(1, 'eventCode is required') }),
});

export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleSchema>['body'];
export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleSchema>['body'];
