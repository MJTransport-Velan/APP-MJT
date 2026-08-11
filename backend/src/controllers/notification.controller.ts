import { Response } from 'express';
import { notificationService } from '../services/notification.service';
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
  listTemplates: asyncHandler(async (_req, res: Response) => {
    const templates = await notificationService.listTemplates();
    return sendSuccess(res, 200, { message: 'Notification templates fetched', data: templates });
  }),
};
