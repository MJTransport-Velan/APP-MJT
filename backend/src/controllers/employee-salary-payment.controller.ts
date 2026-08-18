import { Response } from 'express';
import { employeeSalaryPaymentService } from '../services/employee-salary-payment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const employeeSalaryPaymentController = {
  listForEmployee: asyncHandler(async (req, res: Response) => {
    const payments = await employeeSalaryPaymentService.listForEmployee(req.params.employeeId);
    return sendSuccess(res, 200, { message: 'Salary payments fetched', data: payments });
  }),
};
