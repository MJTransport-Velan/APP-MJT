import { Response } from 'express';
import { collectionActivityService } from '../services/collection-activity.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const collectionActivityController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await collectionActivityService.list(req.query);
    return sendSuccess(res, 200, { message: 'Collection activities fetched', data: result.data, meta: result.meta });
  }),
  upcoming: asyncHandler(async (req, res: Response) => {
    const rows = await collectionActivityService.upcomingFollowUps(req.query.days ? Number(req.query.days) : 3);
    return sendSuccess(res, 200, { message: 'Upcoming follow-ups fetched', data: rows });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const activity = await collectionActivityService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Collection activity logged', data: activity });
  }),
};
