import { Response } from 'express';
import { kpiService } from '../services/kpi.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const kpiController = {
  listDefinitions: asyncHandler(async (_req, res: Response) => {
    const data = await kpiService.listDefinitions();
    return sendSuccess(res, 200, { message: 'KPI definitions fetched', data });
  }),
  computeSnapshots: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await kpiService.computeSnapshots(req.user!.userId);
    return sendSuccess(res, 201, { message: 'KPI snapshots computed', data });
  }),
  executiveDashboard: asyncHandler(async (_req, res: Response) => {
    const data = await kpiService.executiveDashboard();
    return sendSuccess(res, 200, { message: 'Executive dashboard fetched', data });
  }),
};
