import { Response } from 'express';
import { vehicleLoanService } from '../services/vehicle-loan.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const vehicleLoanController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await vehicleLoanService.list(req.query);
    return sendSuccess(res, 200, { message: 'Vehicle Loans fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const loan = await vehicleLoanService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Vehicle Loan fetched', data: loan });
  }),
  request: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await vehicleLoanService.request(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Vehicle Loan requested', data: loan });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await vehicleLoanService.approve(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Vehicle Loan approved — EMI schedule generated', data: loan });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await vehicleLoanService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Vehicle Loan rejected', data: loan });
  }),
  disburse: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await vehicleLoanService.disburse(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Disbursement recorded', data: loan });
  }),
  payInstallment: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await vehicleLoanService.payInstallment(req.params.id, req.params.installmentId, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'EMI paid', data: loan });
  }),
  foreclose: asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await vehicleLoanService.foreclose(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Loan foreclosed', data: loan });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await vehicleLoanService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Vehicle Loan deleted' });
  }),
};
