import { Response } from 'express';
import { profitLossService } from '../services/profit-loss.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const profitLossController = {
  get: asyncHandler(async (req, res: Response) => {
    const result = await profitLossService.get({ from: req.query.from as string | undefined, to: req.query.to as string | undefined });
    return sendSuccess(res, 200, { message: 'Profit & Loss report fetched', data: result });
  }),
};
