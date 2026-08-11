import { Response } from 'express';
import { expenseAnalysisService } from '../services/expense-analysis.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const expenseAnalysisController = {
  analyze: asyncHandler(async (req, res: Response) => {
    const data = await expenseAnalysisService.analyze(req.query);
    return sendSuccess(res, 200, { message: 'Expense Analysis fetched', data });
  }),
};
