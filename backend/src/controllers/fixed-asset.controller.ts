import { Response } from 'express';
import { fixedAssetService } from '../services/fixed-asset.service';
import { vehicleCostSummaryService } from '../services/vehicle-cost-summary.service';
import { dashboardEngineService } from '../services/dashboard-engine.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const fixedAssetController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await fixedAssetService.list(req.query);
    return sendSuccess(res, 200, { message: 'Fixed Assets fetched', data: result.data, meta: result.meta });
  }),
  dashboard: asyncHandler(async (_req, res: Response) => {
    const dashboard = await dashboardEngineService.getWidget('assets');
    return sendSuccess(res, 200, { message: 'Asset Dashboard fetched', data: dashboard });
  }),
  costSummary: asyncHandler(async (req, res: Response) => {
    const summary = await vehicleCostSummaryService.getForAsset(req.params.id);
    return sendSuccess(res, 200, { message: 'Vehicle Cost Summary fetched', data: summary });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const asset = await fixedAssetService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Fixed Asset fetched', data: asset });
  }),
  register: asyncHandler(async (req: AuthRequest, res: Response) => {
    const asset = await fixedAssetService.register(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Fixed Asset registered', data: asset });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const asset = await fixedAssetService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Fixed Asset updated', data: asset });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const asset = await fixedAssetService.approve(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Fixed Asset purchase approved and posted', data: asset });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const asset = await fixedAssetService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Fixed Asset rejected', data: asset });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await fixedAssetService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Fixed Asset deleted' });
  }),
};
