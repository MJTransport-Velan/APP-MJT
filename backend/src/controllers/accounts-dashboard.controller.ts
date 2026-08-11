import { Response } from 'express';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const accountsDashboardController = {
  summary: asyncHandler(async (req, res: Response) => {
    const summary = await dashboardEngineService.getWidget('accounts');
    return sendSuccess(res, 200, { message: 'Accounts dashboard summary fetched', data: summary });
  }),
};
