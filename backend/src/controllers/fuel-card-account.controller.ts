import { Response } from 'express';
import { fuelCardAccountService } from '../services/fuel-card-account.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const fuelCardAccountController = {
  getAccount: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await fuelCardAccountService.getAccount(req.user!.userId);
    return sendSuccess(res, 200, { message: 'Diesel card account fetched', data: account });
  }),
  accountSummary: asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await fuelCardAccountService.accountSummary(req.user!.userId);
    return sendSuccess(res, 200, { message: 'Diesel card account summary fetched', data: summary });
  }),
  listTransactions: asyncHandler(async (req, res: Response) => {
    const result = await fuelCardAccountService.listTransactions(req.query);
    return sendSuccess(res, 200, { message: 'Diesel card transactions fetched', data: result.data, meta: result.meta });
  }),
  recharge: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await fuelCardAccountService.recharge(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Diesel card account recharged', data: account });
  }),
  refund: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await fuelCardAccountService.refund(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Diesel card refund recorded', data: account });
  }),
  adjust: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await fuelCardAccountService.adjust(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Diesel card account balance adjusted', data: account });
  }),
  updateTransaction: asyncHandler(async (req: AuthRequest, res: Response) => {
    const transaction = await fuelCardAccountService.updateTransaction(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Diesel card transaction updated', data: transaction });
  }),
  deleteTransaction: asyncHandler(async (req: AuthRequest, res: Response) => {
    await fuelCardAccountService.deleteTransaction(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Diesel card transaction deleted', data: null });
  }),
};
