import { Response } from 'express';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { parseDateRange } from '../utils/dateRange';

export const payrollDashboardController = {
  getSummary: asyncHandler(async (req, res: Response) => {
    const summary = await dashboardEngineService.getWidget('payroll', { range: parseDateRange(req.query) });
    return sendSuccess(res, 200, { message: 'Payroll Dashboard fetched', data: summary });
  }),
};
