import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { AppError } from '../middlewares/error.middleware';
import { notificationRepository } from '../repositories/notification.repository';
import { organizationService } from './organization.service';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '@prisma/client';

export interface SendNotificationInput {
  organizationId?: string;
  userId?: string | null;
  roleId?: string | null;
  category: NotificationCategory;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

async function userRoleIds(userId: string): Promise<string[]> {
  const rows = await prisma.userRole.findMany({ where: { userId }, select: { roleId: true } });
  return rows.map((r) => r.roleId);
}

export const notificationService = {
  /**
   * Fire-and-forget style like auditService.record — a notification failing
   * to send must never fail the business operation that triggered it.
   * EMAIL channel is architecture-only (design brief): the row records
   * intent and deliveryStatus, no SMTP transport is wired up yet.
   */
  async send(input: SendNotificationInput): Promise<void> {
    try {
      const organizationId = await organizationService.resolveOrganizationId(input.organizationId);
      await notificationRepository.create({
        organizationId,
        userId: input.userId ?? null,
        roleId: input.roleId ?? null,
        category: input.category,
        priority: input.priority ?? 'NORMAL',
        channel: input.channel ?? 'IN_APP',
        title: input.title,
        message: input.message,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        deliveryStatus: input.channel === 'EMAIL' ? 'QUEUED' : null,
      });
    } catch (err) {
      logger.error('Failed to send notification', err);
    }
  },

  async list(query: { page?: string; pageSize?: string; isRead?: string }, userId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const roleIds = await userRoleIds(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Number(query.pageSize) || 20);
    const { rows, total } = await notificationRepository.findForUser({
      organizationId,
      userId,
      roleIds,
      isRead: query.isRead === undefined ? undefined : query.isRead === 'true',
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },

  async unreadCount(userId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const roleIds = await userRoleIds(userId);
    return notificationRepository.unreadCount(organizationId, userId, roleIds);
  },

  async markRead(id: string, userId: string) {
    const existing = await notificationRepository.findById(id);
    if (!existing) throw new AppError('Notification not found', 404);
    if (existing.userId && existing.userId !== userId) {
      throw new AppError('Not authorized to modify this notification', 403);
    }
    return notificationRepository.markRead(id);
  },

  async markAllRead(userId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const roleIds = await userRoleIds(userId);
    const result = await notificationRepository.markAllRead(organizationId, userId, roleIds);
    return { updated: result.count };
  },

  listTemplates() {
    return notificationRepository.listTemplates();
  },
};
