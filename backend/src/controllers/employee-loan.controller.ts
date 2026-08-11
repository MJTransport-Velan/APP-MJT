import { Response } from 'express';
import { employeeLoanService } from '../services/employee-loan.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const employeeLoanController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await employeeLoanService.list(req.query);
    return sendSuccess(res, 200, { message: 'Employee Loans fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const loan = await employeeLoanService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Employee Loan fetched', data: loan });
  }),
  request: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await employeeLoanService.request(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Employee Loan requested', data: loan });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await employeeLoanService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Employee Loan approved and disbursed', data: loan });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await employeeLoanService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Employee Loan rejected', data: loan });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await employeeLoanService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Employee Loan deleted' });
  }),
};
