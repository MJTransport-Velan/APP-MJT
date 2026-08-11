import { Response } from 'express';
import { transportRouteService } from '../services/transport-route.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const transportRouteController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await transportRouteService.list(req.query);
    return sendSuccess(res, 200, { message: 'Routes fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const route = await transportRouteService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Route fetched', data: route });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const route = await transportRouteService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Route created', data: route });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const route = await transportRouteService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Route updated', data: route });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const route = await transportRouteService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Route status updated', data: route });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await transportRouteService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Route deleted' });
  }),
};
