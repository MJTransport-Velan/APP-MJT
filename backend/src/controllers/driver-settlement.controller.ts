import { Response } from 'express';
import { driverSettlementService } from '../services/driver-settlement.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const driverSettlementController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await driverSettlementService.list(req.query);
    return sendSuccess(res, 200, { message: 'Driver Settlements fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const s = await driverSettlementService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Driver Settlement fetched', data: s });
  }),
  preview: asyncHandler(async (req, res: Response) => {
    const result = await driverSettlementService.preview(req.query.driverId as string, req.query.periodStart as string, req.query.periodEnd as string);
    return sendSuccess(res, 200, { message: 'Driver Settlement preview computed', data: result });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const s = await driverSettlementService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Driver Settlement created', data: s });
  }),
  calculate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const s = await driverSettlementService.calculate(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Settlement calculated', data: s });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const s = await driverSettlementService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Settlement approved', data: s });
  }),
  pay: asyncHandler(async (req: AuthRequest, res: Response) => {
    const s = await driverSettlementService.pay(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Settlement paid', data: s });
  }),
  revertToDraft: asyncHandler(async (req: AuthRequest, res: Response) => {
    const s = await driverSettlementService.revertToDraft(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Settlement reverted to draft', data: s });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await driverSettlementService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Settlement deleted', data: null });
  }),
};
