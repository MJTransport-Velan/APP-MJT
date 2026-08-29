import { Response } from 'express';
import { loanGivenService } from '../services/loan-given.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const loanGivenController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await loanGivenService.list(req.query);
    return sendSuccess(res, 200, { message: 'Loans given fetched', data: result.data, meta: result.meta });
  }),
  summary: asyncHandler(async (_req, res: Response) => {
    const data = await loanGivenService.summary();
    return sendSuccess(res, 200, { message: 'Loans given summary fetched', data });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const data = await loanGivenService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Loan given fetched', data });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await loanGivenService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Money lent recorded', data });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await loanGivenService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Loan given updated', data });
  }),
  recordRepayment: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await loanGivenService.recordRepayment(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Repayment recorded', data });
  }),
  removeRepayment: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await loanGivenService.removeRepayment(req.params.id, req.params.repaymentId, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Repayment reversed', data });
  }),
  writeOff: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await loanGivenService.writeOff(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Loan written off', data });
  }),
  reopen: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await loanGivenService.reopen(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Loan reopened', data });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await loanGivenService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Loan given deleted', data: null });
  }),
};
