import { Response } from 'express';
import { vehicleTyreService } from '../services/vehicle-tyre.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const vehicleTyreController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await vehicleTyreService.list(req.query);
    return sendSuccess(res, 200, { message: 'Vehicle Tyres fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const tyre = await vehicleTyreService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Vehicle Tyre fetched', data: tyre });
  }),
  install: asyncHandler(async (req: AuthRequest, res: Response) => {
    const tyre = await vehicleTyreService.install(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Tyre installed', data: tyre });
  }),
  rotate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const tyre = await vehicleTyreService.rotate(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Tyre rotated', data: tyre });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    const tyre = await vehicleTyreService.remove(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Tyre removed', data: tyre });
  }),
  scrap: asyncHandler(async (req: AuthRequest, res: Response) => {
    const tyre = await vehicleTyreService.scrap(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Tyre scrapped', data: tyre });
  }),
};
