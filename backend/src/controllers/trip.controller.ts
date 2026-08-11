import { Response } from 'express';
import { tripService } from '../services/trip.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const tripController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await tripService.list(req.query, req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Trips fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const trip = await tripService.getById(req.params.id, req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Trip fetched', data: trip });
  }),
  stats: asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await tripService.stats(req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Trip stats fetched', data: stats });
  }),
  timeline: asyncHandler(async (req: AuthRequest, res: Response) => {
    const history = await tripService.timeline(req.params.id, req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Trip timeline fetched', data: history });
  }),
  availableResources: asyncHandler(async (req: AuthRequest, res: Response) => {
    const excludeTripId = (req.query.excludeTripId as string) || undefined;
    const result = await tripService.availableResources(excludeTripId, req.user?.roles);
    return sendSuccess(res, 200, { message: 'Available vehicles and drivers fetched', data: result });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const trip = await tripService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Trip created', data: trip });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const trip = await tripService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Trip updated', data: trip });
  }),
  assign: asyncHandler(async (req: AuthRequest, res: Response) => {
    const trip = await tripService.assign(req.params.id, req.body, req.user!.userId, req.user?.roles);
    return sendSuccess(res, 200, { message: 'Vehicle and driver assigned', data: trip });
  }),
  allocate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const trip = await tripService.allocate(req.params.id, req.body, req.user!.userId, req.user?.roles);
    return sendSuccess(res, 200, { message: 'Asset allocated', data: trip });
  }),
  updateStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const trip = await tripService.updateStatus(req.params.id, req.body.status, req.body.notes, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Trip status updated', data: trip });
  }),
  start: asyncHandler(async (req: AuthRequest, res: Response) => {
    const trip = await tripService.updateStatus(req.params.id, 'STARTED', req.body?.notes, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Trip started', data: trip });
  }),
  complete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const trip = await tripService.updateStatus(req.params.id, 'COMPLETED', req.body?.notes, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Trip completed', data: trip });
  }),
  cancel: asyncHandler(async (req: AuthRequest, res: Response) => {
    const trip = await tripService.cancel(req.params.id, req.body.cancelReason, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Trip cancelled', data: trip });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await tripService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Trip deleted' });
  }),
};
