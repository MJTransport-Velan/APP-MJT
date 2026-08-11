import { Response } from 'express';
import { driverLoanService } from '../services/driver-loan.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const driverLoanController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await driverLoanService.list(req.query);
    return sendSuccess(res, 200, { message: 'Driver Loans fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const loan = await driverLoanService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Driver Loan fetched', data: loan });
  }),
  request: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await driverLoanService.request(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Driver Loan requested', data: loan });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await driverLoanService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Loan approved and disbursed', data: loan });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await driverLoanService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Driver Loan rejected', data: loan });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await driverLoanService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver Loan deleted' });
  }),
};
