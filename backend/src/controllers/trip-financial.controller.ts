import { Response } from 'express';
import { tripFinancialService } from '../services/trip-financial.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { parseDateRange } from '../utils/dateRange';

export const tripFinancialController = {
  getForTrip: asyncHandler(async (req, res: Response) => {
    const line = await tripFinancialService.getForTrip(req.params.tripId);
    return sendSuccess(res, 200, { message: 'Trip financial summary fetched', data: line });
  }),
  vehicleWise: asyncHandler(async (req, res: Response) => {
    const { from, to } = parseDateRange(req.query);
    const data = await tripFinancialService.vehicleWise(from, to);
    return sendSuccess(res, 200, { message: 'Vehicle-wise profit fetched', data });
  }),
  supplierWise: asyncHandler(async (req, res: Response) => {
    const { from, to } = parseDateRange(req.query);
    const data = await tripFinancialService.supplierWise(from, to);
    return sendSuccess(res, 200, { message: 'Supplier-wise profit fetched', data });
  }),
  customerWise: asyncHandler(async (req, res: Response) => {
    const { from, to } = parseDateRange(req.query);
    const data = await tripFinancialService.customerWise(from, to);
    return sendSuccess(res, 200, { message: 'Customer-wise profit fetched', data });
  }),
};
