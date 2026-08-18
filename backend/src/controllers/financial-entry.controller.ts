import { Response } from 'express';
import { financialEntryService } from '../services/financial-entry.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const financialEntryController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await financialEntryService.list(req.query);
    return sendSuccess(res, 200, { message: 'Financial Entries fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const entry = await financialEntryService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Financial Entry fetched', data: entry });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const entry = await financialEntryService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Financial Entry recorded', data: entry });
  }),
  cancel: asyncHandler(async (req: AuthRequest, res: Response) => {
    const entry = await financialEntryService.cancel(req.params.id, req.body.reason, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Financial Entry cancelled', data: entry });
  }),
  reverse: asyncHandler(async (req: AuthRequest, res: Response) => {
    const entry = await financialEntryService.reverse(req.params.id, req.body.reason, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Financial Entry reversed', data: entry });
  }),
  correct: asyncHandler(async (req: AuthRequest, res: Response) => {
    const entry = await financialEntryService.correct(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Financial Entry corrected', data: entry });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await financialEntryService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Financial Entry deleted', data: null });
  }),
};
