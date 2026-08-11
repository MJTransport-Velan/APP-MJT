import { Response } from 'express';
import { receiptService } from '../services/receipt.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const receiptController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await receiptService.list(req.query, req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Receipts fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const receipt = await receiptService.getById(req.params.id, req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Receipt fetched', data: receipt });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const receipt = await receiptService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Receipt recorded', data: receipt });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const receipt = await receiptService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Receipt updated', data: receipt });
  }),
  allocate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const receipt = await receiptService.allocate(req.params.id, req.body.invoiceId, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Receipt allocated to invoice', data: receipt });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await receiptService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Receipt deleted' });
  }),
};
