import { Response } from 'express';
import { vehicleComplianceService } from '../services/vehicle-compliance.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const vehicleComplianceController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await vehicleComplianceService.list(req.query);
    return sendSuccess(res, 200, { message: 'Compliance Records fetched', data: result.data, meta: result.meta });
  }),
  expiringWithin: asyncHandler(async (req, res: Response) => {
    const days = req.query.days ? Number(req.query.days) : 30;
    const records = await vehicleComplianceService.expiringWithin(days);
    return sendSuccess(res, 200, { message: 'Expiring Compliance Records fetched', data: records });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const record = await vehicleComplianceService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Compliance Record fetched', data: record });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await vehicleComplianceService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Compliance Record created', data: record });
  }),
  fileClaim: asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await vehicleComplianceService.fileClaim(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Insurance claim filed', data: record });
  }),
  settleClaim: asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await vehicleComplianceService.settleClaim(req.params.claimId, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Insurance claim updated', data: record });
  }),
};
