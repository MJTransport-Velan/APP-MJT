import { Response } from 'express';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { parseDateRange } from '../utils/dateRange';

export const bankingDashboardController = {
  summary: asyncHandler(async (req, res: Response) => {
    const summary = await dashboardEngineService.getWidget('banking', { organizationId: req.query.organizationId as string | undefined, range: parseDateRange(req.query) });
    return sendSuccess(res, 200, { message: 'Banking dashboard fetched', data: summary });
  }),
};
