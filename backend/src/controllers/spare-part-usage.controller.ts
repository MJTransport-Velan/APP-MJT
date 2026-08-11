import { Response } from 'express';
import { sparePartUsageService } from '../services/spare-part-usage.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const sparePartUsageController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await sparePartUsageService.list(req.query);
    return sendSuccess(res, 200, { message: 'Spare part usage records fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const usage = await sparePartUsageService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Spare part usage record fetched', data: usage });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const usage = await sparePartUsageService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Spare part usage recorded', data: usage });
  }),
};
