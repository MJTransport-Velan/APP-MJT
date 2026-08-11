import { z } from 'zod';

const ruleTypeEnum = z.enum(['CREDIT_LIMIT', 'PAYMENT', 'LOAN', 'PAYROLL', 'EXPENSE', 'GST', 'APPROVAL', 'DUPLICATE_DETECTION']);

export const listBusinessRulesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ ruleType: ruleTypeEnum.optional() }),
});

export const businessRuleIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid business rule id') }),
});

export const createBusinessRuleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    ruleType: ruleTypeEnum,
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    conditionJson: z.string().min(1, 'Condition JSON is required'),
    actionJson: z.string().optional(),
    priority: z.number().int().optional(),
  }),
});

export const updateBusinessRuleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid business rule id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    conditionJson: z.string().min(1).optional(),
    actionJson: z.string().optional(),
    priority: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateBusinessRuleInput = z.infer<typeof createBusinessRuleSchema>['body'];
export type UpdateBusinessRuleInput = z.infer<typeof updateBusinessRuleSchema>['body'];
