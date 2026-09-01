import { Response } from 'express';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { parseDateRange } from '../utils/dateRange';

export const misDashboardController = {
  summary: asyncHandler(async (req, res: Response) => {
    const data = await dashboardEngineService.getWidget('mis', { range: parseDateRange(req.query) });
    return sendSuccess(res, 200, { message: 'MIS Dashboard fetched', data });
  }),
};
