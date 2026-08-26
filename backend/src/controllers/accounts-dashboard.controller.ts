import { Response } from 'express';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { accountsDashboardService } from '../services/accounts-dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const accountsDashboardController = {
  summary: asyncHandler(async (req, res: Response) => {
    const summary = await dashboardEngineService.getWidget('accounts');
    return sendSuccess(res, 200, { message: 'Accounts dashboard summary fetched', data: summary });
  }),
  trends: asyncHandler(async (req, res: Response) => {
    const monthsBack = Math.min(Math.max(parseInt(String(req.query.monthsBack ?? '6'), 10) || 6, 1), 24);
    const monthsAhead = Math.min(Math.max(parseInt(String(req.query.monthsAhead ?? '6'), 10) || 6, 1), 24);
    const data = await accountsDashboardService.getTrends(monthsBack, monthsAhead);
    return sendSuccess(res, 200, { message: 'Finance dashboard trends fetched', data });
  }),
};
