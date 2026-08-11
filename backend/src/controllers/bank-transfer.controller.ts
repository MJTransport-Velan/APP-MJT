import { Response } from 'express';
import { bankTransferService } from '../services/bank-transfer.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const bankTransferController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await bankTransferService.list(req.query);
    return sendSuccess(res, 200, { message: 'Bank Transfers fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const transfer = await bankTransferService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Bank Transfer fetched', data: transfer });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const transfer = await bankTransferService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Bank Transfer created', data: transfer });
  }),
};
