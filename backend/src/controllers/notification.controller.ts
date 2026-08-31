import { Response } from 'express';
import { notificationService } from '../services/notification.service';
import { dueReminderService } from '../services/due-reminder.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const notificationController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await notificationService.list(req.query as { page?: string; pageSize?: string; isRead?: string }, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Notifications fetched', data: result.data, meta: result.meta });
  }),
  unreadCount: asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await notificationService.unreadCount(req.user!.userId);
    return sendSuccess(res, 200, { message: 'Unread count fetched', data: { count } });
  }),
  markRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    const notification = await notificationService.markRead(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Notification marked read', data: notification });
  }),
  markAllRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await notificationService.markAllRead(req.user!.userId);
    return sendSuccess(res, 200, { message: 'All notifications marked read', data: result });
  }),
  /**
   * Live "what falls due in the next N days" list, filtered to the kinds the
   * caller may see. SUPER_ADMIN bypasses the filter, same rule as the
   * authorize middleware.
   */
  dueReminders: asyncHandler(async (req: AuthRequest, res: Response) => {
    const isSuperAdmin = req.user!.roles.includes('SUPER_ADMIN');
    const result = await dueReminderService.preview({
      leadDays: req.query.leadDays ? Number(req.query.leadDays) : undefined,
      permissions: isSuperAdmin ? null : req.user!.permissions,
    });
    return sendSuccess(res, 200, { message: 'Due reminders fetched', data: result });
  }),
  runDueReminderScan: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await dueReminderService.run({
      leadDays: req.query.leadDays ? Number(req.query.leadDays) : undefined,
    });
    return sendSuccess(res, 200, { message: 'Due-date reminder scan completed', data: result });
  }),
  listTemplates: asyncHandler(async (_req, res: Response) => {
    const templates = await notificationService.listTemplates();
    return sendSuccess(res, 200, { message: 'Notification templates fetched', data: templates });
  }),
};
