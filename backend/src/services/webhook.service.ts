import crypto from 'crypto';
import { webhookRepository } from '../repositories/webhook.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { logger } from '../config/logger';
import { CreateWebhookSubscriptionInput } from '../validators/webhook.validator';

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function attemptDelivery(deliveryId: string, url: string, payloadJson: string, signature: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-MJERP-Signature': signature },
      body: payloadJson,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseBody = await response.text().catch(() => '');
    await webhookRepository.updateDelivery(deliveryId, {
      status: response.ok ? 'SUCCESS' : 'FAILED',
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
      responseStatus: response.status,
      responseBody: responseBody.slice(0, 1000),
    });
  } catch (err) {
    logger.error(`Webhook delivery ${deliveryId} failed`, err);
    await webhookRepository.updateDelivery(deliveryId, {
      status: 'FAILED',
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
      responseBody: err instanceof Error ? err.message.slice(0, 1000) : 'Delivery failed',
    });
  }
}

export const webhookService = {
  async listSubscriptions() {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    return webhookRepository.findAllSubscriptions(organizationId);
  },

  async createSubscription(input: CreateWebhookSubscriptionInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const secret = input.secret || crypto.randomBytes(24).toString('hex');
    const subscription = await webhookRepository.createSubscription({
      organizationId,
      name: input.name,
      url: input.url,
      secret,
      eventTypes: input.eventTypes.join(','),
      createdById: actorId,
    });
    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'WebhookSubscription', entityId: subscription.id, description: `Created webhook subscription "${input.name}"` });
    return subscription;
  },

  async updateSubscription(id: string, input: { name?: string; url?: string; eventTypes?: string[]; isActive?: boolean }, actorId: string) {
    const existing = await webhookRepository.findSubscriptionById(id);
    if (!existing) throw new AppError('Webhook subscription not found', 404);
    const updated = await webhookRepository.updateSubscription(id, {
      name: input.name,
      url: input.url,
      eventTypes: input.eventTypes ? input.eventTypes.join(',') : undefined,
      isActive: input.isActive,
    });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'WebhookSubscription', entityId: id, description: `Updated webhook subscription "${existing.name}"` });
    return updated;
  },

  async removeSubscription(id: string, actorId: string) {
    const existing = await webhookRepository.findSubscriptionById(id);
    if (!existing) throw new AppError('Webhook subscription not found', 404);
    await webhookRepository.removeSubscription(id);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'WebhookSubscription', entityId: id, description: `Removed webhook subscription "${existing.name}"` });
  },

  /** Fire-and-forget, like notificationService.send — a webhook failing to reach its target must never fail the operation that triggered the event. */
  async dispatch(organizationId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const subscriptions = await webhookRepository.findActiveSubscriptionsForEvent(organizationId, eventType);
      const payloadJson = JSON.stringify({ event: eventType, occurredAt: new Date().toISOString(), data: payload });

      for (const sub of subscriptions) {
        const signature = sign(payloadJson, sub.secret);
        const delivery = await webhookRepository.createDelivery({ subscriptionId: sub.id, eventType, payloadJson, signature });
        void attemptDelivery(delivery.id, sub.url, payloadJson, signature);
      }
    } catch (err) {
      logger.error('Webhook dispatch failed', err);
    }
  },

  /** Retry sweep — driven by the WEBHOOK_RETRY automation action, or called manually. */
  async retryFailedDeliveries(maxAttempts = 5) {
    const pending = await webhookRepository.findPendingOrFailedDeliveries(maxAttempts);
    for (const delivery of pending) {
      void attemptDelivery(delivery.id, delivery.subscription.url, delivery.payloadJson, delivery.signature);
    }
    return { retried: pending.length };
  },

  async listDeliveries(query: { subscriptionId?: string; page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Number(query.pageSize) || 25);
    const { rows, total } = await webhookRepository.findDeliveriesPaginated({ subscriptionId: query.subscriptionId, skip: (page - 1) * pageSize, take: pageSize });
    return { data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },

  async testWebhook(id: string, actorId: string) {
    const subscription = await webhookRepository.findSubscriptionById(id);
    if (!subscription) throw new AppError('Webhook subscription not found', 404);

    const payloadJson = JSON.stringify({ event: 'webhook.test', occurredAt: new Date().toISOString(), data: { message: 'Test delivery from MJ Transport ERP' } });
    const signature = sign(payloadJson, subscription.secret);
    const delivery = await webhookRepository.createDelivery({ subscriptionId: id, eventType: 'webhook.test', payloadJson, signature });
    await attemptDelivery(delivery.id, subscription.url, payloadJson, signature);

    await auditService.record({ userId: actorId, action: 'TEST_WEBHOOK', entityType: 'WebhookSubscription', entityId: id, description: `Sent test webhook to ${subscription.url}` });
    return { deliveryId: delivery.id };
  },
};
