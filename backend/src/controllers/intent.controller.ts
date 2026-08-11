import { Response } from 'express';
import { intentService } from '../services/intent.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const intentController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await intentService.list(req.query, req);
    return sendSuccess(res, 200, { message: 'Intents fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const intent = await intentService.getById(req.params.id, req);
    return sendSuccess(res, 200, { message: 'Intent fetched', data: intent });
  }),
  stats: asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await intentService.stats(req);
    return sendSuccess(res, 200, { message: 'Intent stats fetched', data: stats });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const intent = await intentService.create(req.body, req);
    return sendSuccess(res, 201, { message: 'Intent created', data: intent });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const intent = await intentService.update(req.params.id, req.body, req);
    return sendSuccess(res, 200, { message: 'Intent updated', data: intent });
  }),
  submit: asyncHandler(async (req: AuthRequest, res: Response) => {
    const intent = await intentService.submit(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Intent submitted for approval', data: intent });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const intent = await intentService.approve(
      req.params.id,
      req.body.opsAmount,
      req.body.fleetType,
      req.user!.userId
    );
    return sendSuccess(res, 200, { message: 'Intent approved', data: intent });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const intent = await intentService.reject(req.params.id, req.body.rejectionReason, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Intent rejected', data: intent });
  }),
  cancel: asyncHandler(async (req: AuthRequest, res: Response) => {
    const intent = await intentService.cancel(req.params.id, req.body.remarks, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Intent cancelled', data: intent });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await intentService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Intent deleted' });
  }),
};
