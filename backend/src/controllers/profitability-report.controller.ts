import { Response } from 'express';
import { profitabilityReportService } from '../services/profitability-report.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const profitabilityReportController = {
  customer: asyncHandler(async (req, res: Response) => {
    const data = await profitabilityReportService.customerProfitability(req.query);
    return sendSuccess(res, 200, { message: 'Customer Profitability fetched', data });
  }),
  supplier: asyncHandler(async (req, res: Response) => {
    const data = await profitabilityReportService.supplierProfitability(req.query);
    return sendSuccess(res, 200, { message: 'Supplier Profitability fetched', data });
  }),
  vehicle: asyncHandler(async (req, res: Response) => {
    const data = await profitabilityReportService.vehicleProfitability(req.query);
    return sendSuccess(res, 200, { message: 'Vehicle Profitability fetched', data });
  }),
  driver: asyncHandler(async (req, res: Response) => {
    const data = await profitabilityReportService.driverProfitability(req.query);
    return sendSuccess(res, 200, { message: 'Driver Profitability fetched', data });
  }),
};
