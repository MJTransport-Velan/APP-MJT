import { Response } from 'express';
import { financialStateService } from '../services/financial-state.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const financialStateController = {
  customer: asyncHandler(async (req, res: Response) => {
    const state = await financialStateService.customerState(req.params.companyId);
    return sendSuccess(res, 200, { message: 'Customer financial state fetched', data: state });
  }),
  supplier: asyncHandler(async (req, res: Response) => {
    const state = await financialStateService.supplierState(req.params.supplierId);
    return sendSuccess(res, 200, { message: 'Supplier financial state fetched', data: state });
  }),
  driver: asyncHandler(async (req, res: Response) => {
    const state = await financialStateService.driverState(req.params.driverId);
    return sendSuccess(res, 200, { message: 'Driver financial state fetched', data: state });
  }),
  vehicle: asyncHandler(async (req, res: Response) => {
    const state = await financialStateService.vehicleState(req.params.vehicleId);
    return sendSuccess(res, 200, { message: 'Vehicle financial state fetched', data: state });
  }),
  employee: asyncHandler(async (req, res: Response) => {
    const state = await financialStateService.employeeState(req.params.employeeId);
    return sendSuccess(res, 200, { message: 'Employee financial state fetched', data: state });
  }),
  bankAndCash: asyncHandler(async (req, res: Response) => {
    const state = await financialStateService.bankAndCashState(req.query.organizationId as string | undefined);
    return sendSuccess(res, 200, { message: 'Bank & Cash state fetched', data: state });
  }),
  dashboard: asyncHandler(async (req, res: Response) => {
    const summary = await financialStateService.dashboard({ from: req.query.from as string | undefined, to: req.query.to as string | undefined });
    return sendSuccess(res, 200, { message: 'Financial dashboard fetched', data: summary });
  }),
};
