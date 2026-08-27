import { Response } from 'express';
import { capitalTransactionService } from '../services/capital-transaction.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const capitalTransactionController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await capitalTransactionService.list(req.query);
    return sendSuccess(res, 200, { message: 'Capital Transactions fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const result = await capitalTransactionService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Capital Transaction fetched', data: result });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await capitalTransactionService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Capital Transaction recorded', data: result });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const transaction = await capitalTransactionService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Capital Transaction updated', data: transaction });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await capitalTransactionService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Capital Transaction deleted', data: null });
  }),
  partnerState: asyncHandler(async (req, res: Response) => {
    const result = await capitalTransactionService.partnerState(req.params.partnerId);
    return sendSuccess(res, 200, { message: 'Capital Partner state fetched', data: result });
  }),
};
