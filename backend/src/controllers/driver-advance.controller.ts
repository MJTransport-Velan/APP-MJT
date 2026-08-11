import { Response } from 'express';
import { driverAdvanceService } from '../services/driver-advance.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const driverAdvanceController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await driverAdvanceService.list(req.query);
    return sendSuccess(res, 200, { message: 'Driver Advances fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const advance = await driverAdvanceService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Driver Advance fetched', data: advance });
  }),
  request: asyncHandler(async (req: AuthRequest, res: Response) => {
    const advance = await driverAdvanceService.request(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Driver Advance requested', data: advance });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const advance = await driverAdvanceService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Advance approved and paid', data: advance });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const advance = await driverAdvanceService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Driver Advance rejected', data: advance });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await driverAdvanceService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Advance deleted' });
  }),
};
