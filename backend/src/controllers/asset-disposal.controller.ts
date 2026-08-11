import { Response } from 'express';
import { assetDisposalService } from '../services/asset-disposal.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const assetDisposalController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await assetDisposalService.list(req.query);
    return sendSuccess(res, 200, { message: 'Asset Disposals fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const disposal = await assetDisposalService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Asset Disposal fetched', data: disposal });
  }),
  raise: asyncHandler(async (req: AuthRequest, res: Response) => {
    const disposal = await assetDisposalService.raise(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Asset Disposal raised', data: disposal });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const disposal = await assetDisposalService.approve(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Asset Disposal approved', data: disposal });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const disposal = await assetDisposalService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Asset Disposal rejected', data: disposal });
  }),
};
