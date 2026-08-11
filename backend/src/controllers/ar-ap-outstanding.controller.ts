import { Response } from 'express';
import { arApOutstandingService } from '../services/ar-ap-outstanding.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const arApOutstandingController = {
  customerOutstanding: asyncHandler(async (req, res: Response) => {
    const rows = await arApOutstandingService.customerOutstanding(req.params.id);
    return sendSuccess(res, 200, { message: 'Customer outstanding fetched', data: rows });
  }),
  supplierOutstanding: asyncHandler(async (req, res: Response) => {
    const rows = await arApOutstandingService.supplierOutstanding(req.params.id);
    return sendSuccess(res, 200, { message: 'Supplier outstanding fetched', data: rows });
  }),
  customerAging: asyncHandler(async (req, res: Response) => {
    const rows = await arApOutstandingService.customerAging({ branchId: req.query.branchId as string | undefined });
    return sendSuccess(res, 200, { message: 'Customer aging fetched', data: rows });
  }),
  supplierAging: asyncHandler(async (req, res: Response) => {
    const rows = await arApOutstandingService.supplierAging();
    return sendSuccess(res, 200, { message: 'Supplier aging fetched', data: rows });
  }),
};
