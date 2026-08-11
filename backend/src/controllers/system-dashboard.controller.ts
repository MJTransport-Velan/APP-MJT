import { Response } from 'express';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const systemDashboardController = {
  health: asyncHandler(async (_req, res: Response) => {
    const data = await dashboardEngineService.getWidget('system.health');
    return sendSuccess(res, 200, { message: 'System health fetched', data });
  }),
  metrics: asyncHandler(async (_req, res: Response) => {
    const data = await dashboardEngineService.getWidget('system.metrics');
    return sendSuccess(res, 200, { message: 'System metrics fetched', data });
  }),
  readiness: asyncHandler(async (_req, res: Response) => {
    const data = await dashboardEngineService.getWidget('system.readiness');
    return sendSuccess(res, 200, { message: 'Production readiness checklist fetched', data });
  }),
};
