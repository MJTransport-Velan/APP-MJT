import { Response } from 'express';
import { driverSalaryPaymentService } from '../services/driver-salary-payment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const driverSalaryPaymentController = {
  listForDriver: asyncHandler(async (req, res: Response) => {
    const payments = await driverSalaryPaymentService.listForDriver(req.params.driverId);
    return sendSuccess(res, 200, { message: 'Salary payments fetched', data: payments });
  }),
};
