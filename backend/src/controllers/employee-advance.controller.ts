import { Response } from 'express';
import { employeeAdvanceService } from '../services/employee-advance.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const employeeAdvanceController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await employeeAdvanceService.list(req.query);
    return sendSuccess(res, 200, { message: 'Employee Advances fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const a = await employeeAdvanceService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Employee Advance fetched', data: a });
  }),
  request: asyncHandler(async (req: AuthRequest, res: Response) => {
    const a = await employeeAdvanceService.request(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Employee Advance requested', data: a });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const a = await employeeAdvanceService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Employee Advance approved and paid', data: a });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const a = await employeeAdvanceService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Employee Advance rejected', data: a });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await employeeAdvanceService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Employee Advance deleted' });
  }),
};
