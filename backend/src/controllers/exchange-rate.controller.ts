import { Response } from 'express';
import { exchangeRateService } from '../services/exchange-rate.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const exchangeRateController = {
  list: asyncHandler(async (req, res: Response) => {
    const data = await exchangeRateService.listForCurrency(req.query.currencyId as string);
    return sendSuccess(res, 200, { message: 'Exchange Rates fetched', data });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const rate = await exchangeRateService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Exchange Rate recorded', data: rate });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const rate = await exchangeRateService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Exchange Rate updated', data: rate });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await exchangeRateService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Exchange Rate deleted' });
  }),
};
