import { Response } from 'express';
import { depreciationRunService } from '../services/depreciation-run.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const depreciationRunController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await depreciationRunService.list(req.query);
    return sendSuccess(res, 200, { message: 'Depreciation Runs fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const run = await depreciationRunService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Depreciation Run fetched', data: run });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await depreciationRunService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Depreciation Run created', data: run });
  }),
  calculate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await depreciationRunService.calculate(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Depreciation Run calculated', data: run });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await depreciationRunService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Depreciation Run approved', data: run });
  }),
};
