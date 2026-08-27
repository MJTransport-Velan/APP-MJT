import { Response } from 'express';
import { bankAccountService } from '../services/bank-account.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const bankAccountController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await bankAccountService.list(req.query);
    return sendSuccess(res, 200, { message: 'Bank Accounts fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const account = await bankAccountService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Bank Account fetched', data: account });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await bankAccountService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Bank Account created', data: account });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await bankAccountService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Bank Account updated', data: account });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await bankAccountService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Bank Account status updated', data: account });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await bankAccountService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Bank Account deleted', data: null });
  }),
};
