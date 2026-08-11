import { Response } from 'express';
import { loanReportService } from '../services/loan-report.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const loanReportController = {
  summary: asyncHandler(async (req, res: Response) => {
    const data = await loanReportService.summary(req.query);
    return sendSuccess(res, 200, { message: 'Loan Report fetched', data });
  }),
};
