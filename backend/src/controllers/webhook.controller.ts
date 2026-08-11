import { Response } from 'express';
import { webhookService } from '../services/webhook.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const webhookController = {
  list: asyncHandler(async (_req, res: Response) => {
    const data = await webhookService.listSubscriptions();
    return sendSuccess(res, 200, { message: 'Webhook subscriptions fetched', data });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await webhookService.createSubscription(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Webhook subscription created', data });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await webhookService.updateSubscription(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Webhook subscription updated', data });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await webhookService.removeSubscription(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Webhook subscription removed' });
  }),
  test: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await webhookService.testWebhook(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Test webhook sent', data });
  }),
  deliveries: asyncHandler(async (req, res: Response) => {
    const result = await webhookService.listDeliveries(req.query as { subscriptionId?: string; page?: string; pageSize?: string });
    return sendSuccess(res, 200, { message: 'Webhook deliveries fetched', data: result.data, meta: result.meta });
  }),
};
