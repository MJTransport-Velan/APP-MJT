import { Response } from 'express';
import { locationService } from '../services/location.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const locationController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await locationService.list(req.query);
    return sendSuccess(res, 200, { message: 'Locations fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const location = await locationService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Location fetched', data: location });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const location = await locationService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Location created', data: location });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const location = await locationService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Location updated', data: location });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const location = await locationService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Location status updated', data: location });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await locationService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Location deleted' });
  }),
};
