import { Response } from 'express';
import { driverReimbursementService } from '../services/driver-reimbursement.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const driverReimbursementController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await driverReimbursementService.list(req.query);
    return sendSuccess(res, 200, { message: 'Driver Reimbursements fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const r = await driverReimbursementService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Driver Reimbursement fetched', data: r });
  }),
  request: asyncHandler(async (req: AuthRequest, res: Response) => {
    const r = await driverReimbursementService.request(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Driver Reimbursement requested', data: r });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const r = await driverReimbursementService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Reimbursement approved', data: r });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const r = await driverReimbursementService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Driver Reimbursement rejected', data: r });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await driverReimbursementService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Reimbursement deleted' });
  }),
};
