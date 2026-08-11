import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const webhookRepository = {
  findAllSubscriptions(organizationId: string) {
    return prisma.webhookSubscription.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  },
  findSubscriptionById(id: string) {
    return prisma.webhookSubscription.findUnique({ where: { id } });
  },
  findActiveSubscriptionsForEvent(organizationId: string, eventType: string) {
    return prisma.webhookSubscription.findMany({ where: { organizationId, isActive: true } }).then((rows) =>
      rows.filter((r) => r.eventTypes.split(',').map((e) => e.trim()).includes(eventType))
    );
  },
  createSubscription(data: Prisma.WebhookSubscriptionUncheckedCreateInput) {
    return prisma.webhookSubscription.create({ data });
  },
  updateSubscription(id: string, data: Prisma.WebhookSubscriptionUncheckedUpdateInput) {
    return prisma.webhookSubscription.update({ where: { id }, data });
  },
  removeSubscription(id: string) {
    return prisma.webhookSubscription.delete({ where: { id } });
  },

  createDelivery(data: Prisma.WebhookDeliveryUncheckedCreateInput) {
    return prisma.webhookDelivery.create({ data });
  },
  updateDelivery(id: string, data: Prisma.WebhookDeliveryUncheckedUpdateInput) {
    return prisma.webhookDelivery.update({ where: { id }, data });
  },
  findPendingOrFailedDeliveries(maxAttempts: number) {
    return prisma.webhookDelivery.findMany({
      where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: maxAttempts } },
      include: { subscription: true },
      take: 100,
    });
  },
  async findDeliveriesPaginated(params: { subscriptionId?: string; skip: number; take: number }) {
    const where: Prisma.WebhookDeliveryWhereInput = { ...(params.subscriptionId ? { subscriptionId: params.subscriptionId } : {}) };
    const [rows, total] = await prisma.$transaction([
      prisma.webhookDelivery.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.webhookDelivery.count({ where }),
    ]);
    return { rows, total };
  },
};
