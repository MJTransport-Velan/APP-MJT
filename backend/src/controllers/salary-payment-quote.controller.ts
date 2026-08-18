import { Response } from 'express';
import { salaryPaymentQuoteService } from '../services/salary-payment-quote.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const salaryPaymentQuoteController = {
  employeeQuote: asyncHandler(async (req, res: Response) => {
    const quote = await salaryPaymentQuoteService.employeeQuote(req.params.employeeId, req.query.period as string);
    return sendSuccess(res, 200, { message: 'Salary quote fetched', data: quote });
  }),
  driverQuote: asyncHandler(async (req, res: Response) => {
    const quote = await salaryPaymentQuoteService.driverQuote(req.params.driverId, req.query.period as string);
    return sendSuccess(res, 200, { message: 'Salary quote fetched', data: quote });
  }),
};
