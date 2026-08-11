import { Response } from 'express';
import { fuelEntryService } from '../services/fuel-entry.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

export const fuelEntryController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await fuelEntryService.list(req.query);
    return sendSuccess(res, 200, { message: 'Fuel entries fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const entry = await fuelEntryService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Fuel entry fetched', data: entry });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const entry = await fuelEntryService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Fuel entry recorded', data: entry });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const entry = await fuelEntryService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Fuel entry updated', data: entry });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await fuelEntryService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Fuel entry deleted' });
  }),
  uploadBill: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) throw new AppError('No bill document uploaded', 400);
    const entry = await fuelEntryService.setBillDocument(req.params.id, `/uploads/documents/${req.file.filename}`, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Bill document uploaded', data: entry });
  }),
  vehicleSummary: asyncHandler(async (req, res: Response) => {
    const summary = await fuelEntryService.vehicleFuelSummary(req.params.vehicleId);
    return sendSuccess(res, 200, { message: 'Vehicle fuel summary fetched', data: summary });
  }),
  advanceBalance: asyncHandler(async (req, res: Response) => {
    const balance = await fuelEntryService.advanceBalance(req.params.advanceId);
    return sendSuccess(res, 200, { message: 'Fuel advance balance fetched', data: balance });
  }),
};
