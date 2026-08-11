import { Response } from 'express';
import { vehicleBatteryService } from '../services/vehicle-battery.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const vehicleBatteryController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await vehicleBatteryService.list(req.query);
    return sendSuccess(res, 200, { message: 'Vehicle Batteries fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const battery = await vehicleBatteryService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Vehicle Battery fetched', data: battery });
  }),
  install: asyncHandler(async (req: AuthRequest, res: Response) => {
    const battery = await vehicleBatteryService.install(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Battery installed', data: battery });
  }),
  dispose: asyncHandler(async (req: AuthRequest, res: Response) => {
    const battery = await vehicleBatteryService.dispose(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Battery disposed', data: battery });
  }),
};
