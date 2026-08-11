import { Response } from 'express';
import { assetTransferService } from '../services/asset-transfer.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const assetTransferController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await assetTransferService.list(req.query);
    return sendSuccess(res, 200, { message: 'Asset Transfers fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const transfer = await assetTransferService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Asset Transfer fetched', data: transfer });
  }),
  request: asyncHandler(async (req: AuthRequest, res: Response) => {
    const transfer = await assetTransferService.request(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Asset Transfer requested', data: transfer });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const transfer = await assetTransferService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Asset Transfer approved', data: transfer });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const transfer = await assetTransferService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Asset Transfer rejected', data: transfer });
  }),
};
