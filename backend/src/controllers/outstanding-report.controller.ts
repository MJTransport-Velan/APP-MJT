import { Response } from 'express';
import { outstandingReportService } from '../services/outstanding-report.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const outstandingReportController = {
  driver: asyncHandler(async (_req, res: Response) => {
    const data = await outstandingReportService.driverOutstanding();
    return sendSuccess(res, 200, { message: 'Driver Outstanding fetched', data });
  }),
  employee: asyncHandler(async (_req, res: Response) => {
    const data = await outstandingReportService.employeeOutstanding();
    return sendSuccess(res, 200, { message: 'Employee Outstanding fetched', data });
  }),
};
