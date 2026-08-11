import { Response } from 'express';
import { driverPenaltyService } from '../services/driver-penalty.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const driverPenaltyController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await driverPenaltyService.list(req.query);
    return sendSuccess(res, 200, { message: 'Driver Penalties fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const p = await driverPenaltyService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Driver Penalty fetched', data: p });
  }),
  request: asyncHandler(async (req: AuthRequest, res: Response) => {
    const p = await driverPenaltyService.request(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Driver Penalty recorded', data: p });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const p = await driverPenaltyService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Penalty approved', data: p });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const p = await driverPenaltyService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Driver Penalty rejected', data: p });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await driverPenaltyService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Penalty deleted' });
  }),
};
