import { z } from 'zod';

export const createWebhookSubscriptionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    url: z.string().url('A valid URL is required'),
    secret: z.string().optional(),
    eventTypes: z.array(z.string()).min(1, 'At least one event type is required'),
  }),
});

export const updateWebhookSubscriptionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid subscription id') }),
  body: z.object({
    name: z.string().min(1).optional(),
    url: z.string().url().optional(),
    eventTypes: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const webhookSubscriptionIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid subscription id') }),
});

export const listWebhookDeliveriesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ subscriptionId: z.string().uuid().optional(), page: z.string().optional(), pageSize: z.string().optional() }),
});

export type CreateWebhookSubscriptionInput = z.infer<typeof createWebhookSubscriptionSchema>['body'];
