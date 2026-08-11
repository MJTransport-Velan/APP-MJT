import { Response } from 'express';
import { supplierVehicleService } from '../services/supplier-vehicle.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const supplierVehicleController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await supplierVehicleService.list(req.query);
    return sendSuccess(res, 200, { message: 'Supplier vehicles fetched', data: result.data, meta: result.meta });
  }),
  assignmentHistory: asyncHandler(async (req, res: Response) => {
    const history = await supplierVehicleService.assignmentHistory(req.params.supplierId);
    return sendSuccess(res, 200, { message: 'Supplier assignment history fetched', data: history });
  }),
};
