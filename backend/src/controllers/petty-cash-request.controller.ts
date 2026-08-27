import { Response } from 'express';
import { pettyCashRequestService } from '../services/petty-cash-request.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const pettyCashRequestController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await pettyCashRequestService.list(req.query);
    return sendSuccess(res, 200, { message: 'Petty Cash Requests fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const request = await pettyCashRequestService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Petty Cash Request fetched', data: request });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await pettyCashRequestService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Petty Cash Request created', data: request });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await pettyCashRequestService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Petty Cash Request updated', data: request });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await pettyCashRequestService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Petty Cash Request deleted', data: null });
  }),
  decide: asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await pettyCashRequestService.decide(req.params.id, req.body.decision, req.body.remarks, req.user!.userId);
    return sendSuccess(res, 200, { message: `Petty Cash Request ${req.body.decision.toLowerCase()}`, data: request });
  }),
  disburse: asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await pettyCashRequestService.disburse(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Petty Cash Request disbursed', data: request });
  }),
  close: asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await pettyCashRequestService.close(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Petty Cash Request closed', data: request });
  }),
};
