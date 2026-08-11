import { Response } from 'express';
import { driverEarningService } from '../services/driver-earning.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const driverEarningController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await driverEarningService.list(req.query);
    return sendSuccess(res, 200, { message: 'Driver Earnings fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const e = await driverEarningService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Driver Earning fetched', data: e });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const e = await driverEarningService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Driver Earning recorded', data: e });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const e = await driverEarningService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Earning approved', data: e });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const e = await driverEarningService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Driver Earning rejected', data: e });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await driverEarningService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Earning deleted' });
  }),
  listRules: asyncHandler(async (_req, res: Response) => {
    const rules = await driverEarningService.listRules();
    return sendSuccess(res, 200, { message: 'Driver Earning Rules fetched', data: rules });
  }),
  createRule: asyncHandler(async (req: AuthRequest, res: Response) => {
    const rule = await driverEarningService.createRule(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Driver Earning Rule created', data: rule });
  }),
  updateRule: asyncHandler(async (req: AuthRequest, res: Response) => {
    const rule = await driverEarningService.updateRule(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Earning Rule updated', data: rule });
  }),
  removeRule: asyncHandler(async (req: AuthRequest, res: Response) => {
    await driverEarningService.removeRule(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Earning Rule deleted' });
  }),
};
