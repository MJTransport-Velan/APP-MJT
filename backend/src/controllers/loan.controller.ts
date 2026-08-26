import { Response } from 'express';
import { loanService } from '../services/loan.service';
import { loanDashboardService } from '../services/loan-dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const loanController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await loanService.list(req.query);
    return sendSuccess(res, 200, { message: 'Loans fetched', data: result.data, meta: result.meta });
  }),
  dashboard: asyncHandler(async (req, res: Response) => {
    const data = await loanDashboardService.get(req.query);
    return sendSuccess(res, 200, { message: 'Loans & EMI dashboard fetched', data });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const loan = await loanService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Loan fetched', data: loan });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await loanService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Loan created and EMI schedule generated', data: loan });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await loanService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Loan updated', data: loan });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await loanService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Loan deleted' });
  }),
  payEmi: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await loanService.payEmi(req.params.id, req.params.installmentId, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'EMI paid — bank balance, loan outstanding and Financial Entry updated', data: loan });
  }),
  reverseEmi: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await loanService.reverseEmi(req.params.id, req.params.installmentId, req.user!.userId);
    return sendSuccess(res, 200, { message: 'EMI payment reversed', data: loan });
  }),
};
