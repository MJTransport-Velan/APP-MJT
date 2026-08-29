import { Response } from 'express';
import { adBlueEntryService } from '../services/adblue-entry.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

export const adBlueEntryController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await adBlueEntryService.list(req.query);
    return sendSuccess(res, 200, { message: 'AdBlue entries fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const entry = await adBlueEntryService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'AdBlue entry fetched', data: entry });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const entry = await adBlueEntryService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'AdBlue entry recorded', data: entry });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const entry = await adBlueEntryService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'AdBlue entry updated', data: entry });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await adBlueEntryService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'AdBlue entry deleted' });
  }),
  uploadBill: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) throw new AppError('No bill document uploaded', 400);
    const entry = await adBlueEntryService.setBillDocument(
      req.params.id,
      `/uploads/documents/${req.file.filename}`,
      req.user!.userId
    );
    return sendSuccess(res, 200, { message: 'Bill document uploaded', data: entry });
  }),
  summary: asyncHandler(async (req, res: Response) => {
    const summary = await adBlueEntryService.summary(req.query);
    return sendSuccess(res, 200, { message: 'AdBlue summary fetched', data: summary });
  }),
  vehicleSummary: asyncHandler(async (req, res: Response) => {
    const summary = await adBlueEntryService.vehicleSummary(req.params.vehicleId, req.query);
    return sendSuccess(res, 200, { message: 'Vehicle AdBlue summary fetched', data: summary });
  }),
  vehicleConsumption: asyncHandler(async (req, res: Response) => {
    const result = await adBlueEntryService.vehicleConsumption(req.query);
    return sendSuccess(res, 200, {
      message: 'Vehicle-wise AdBlue consumption fetched',
      data: result.data,
      meta: { from: result.from, to: result.to },
    });
  }),
};
