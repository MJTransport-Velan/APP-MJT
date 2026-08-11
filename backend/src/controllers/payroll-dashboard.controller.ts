import { Response } from 'express';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const payrollDashboardController = {
  getSummary: asyncHandler(async (_req, res: Response) => {
    const summary = await dashboardEngineService.getWidget('payroll');
    return sendSuccess(res, 200, { message: 'Payroll Dashboard fetched', data: summary });
  }),
};
