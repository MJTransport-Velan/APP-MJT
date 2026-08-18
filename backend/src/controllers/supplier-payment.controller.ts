import { Response } from 'express';
import { supplierPaymentService } from '../services/supplier-payment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const supplierPaymentController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await supplierPaymentService.list(req.query);
    return sendSuccess(res, 200, { message: 'Supplier payments fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const payment = await supplierPaymentService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Supplier payment fetched', data: payment });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const payment = await supplierPaymentService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Supplier payment recorded', data: payment });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const payment = await supplierPaymentService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier payment updated', data: payment });
  }),
  allocate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const payment = await supplierPaymentService.allocate(req.params.id, req.body.billId, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier payment allocated to bill', data: payment });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await supplierPaymentService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier payment deleted' });
  }),
};
