import { Response } from 'express';
import { cashAccountService } from '../services/cash-account.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const cashAccountController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await cashAccountService.list(req.query);
    return sendSuccess(res, 200, { message: 'Cash Accounts fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const account = await cashAccountService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Cash Account fetched', data: account });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await cashAccountService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Cash Account created', data: account });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await cashAccountService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Cash Account updated', data: account });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await cashAccountService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Cash Account status updated', data: account });
  }),
};
