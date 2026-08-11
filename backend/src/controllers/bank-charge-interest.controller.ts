import { Response } from 'express';
import { bankChargeInterestService } from '../services/bank-charge-interest.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const bankChargeInterestController = {
  createBankCharge: asyncHandler(async (req: AuthRequest, res: Response) => {
    const voucher = await bankChargeInterestService.createBankCharge(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Bank charge recorded', data: voucher });
  }),
  createInterest: asyncHandler(async (req: AuthRequest, res: Response) => {
    const voucher = await bankChargeInterestService.createInterest(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Interest entry recorded', data: voucher });
  }),
};
