import { Response } from 'express';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const dashboardController = {
  summary: asyncHandler(async (req, res: Response) => {
    const summary = await dashboardEngineService.getWidget('top-nav');
    return sendSuccess(res, 200, { message: 'Dashboard summary fetched', data: summary });
  }),
};
