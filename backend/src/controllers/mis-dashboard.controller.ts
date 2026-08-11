import { Response } from 'express';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const misDashboardController = {
  summary: asyncHandler(async (_req, res: Response) => {
    const data = await dashboardEngineService.getWidget('mis');
    return sendSuccess(res, 200, { message: 'MIS Dashboard fetched', data });
  }),
};
