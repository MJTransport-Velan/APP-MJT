import { Response } from 'express';
import { payrollRunService } from '../services/payroll-run.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const payrollRunController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await payrollRunService.list(req.query);
    return sendSuccess(res, 200, { message: 'Payroll Runs fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const run = await payrollRunService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Payroll Run fetched', data: run });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await payrollRunService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Payroll Run created', data: run });
  }),
  calculate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await payrollRunService.calculate(req.params.id, req.user!.userId, req.body.employeeIds);
    return sendSuccess(res, 200, { message: 'Payroll Run calculated', data: run });
  }),
  verify: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await payrollRunService.verify(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Payroll Run verified', data: run });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await payrollRunService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Payroll Run approved', data: run });
  }),
  process: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await payrollRunService.process(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Payroll Run processed', data: run });
  }),
  pay: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await payrollRunService.pay(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Payroll Run paid', data: run });
  }),
  cancel: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await payrollRunService.cancel(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Payroll Run cancelled', data: run });
  }),
  revertToDraft: asyncHandler(async (req: AuthRequest, res: Response) => {
    const run = await payrollRunService.revertToDraft(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Payroll Run reverted to draft', data: run });
  }),
};
