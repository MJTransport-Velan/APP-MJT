import { Response } from 'express';
import { maintenanceService } from '../services/maintenance.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const maintenanceController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await maintenanceService.list(req.query);
    return sendSuccess(res, 200, { message: 'Maintenance records fetched', data: result.data, meta: result.meta });
  }),
  upcomingDue: asyncHandler(async (req, res: Response) => {
    const records = await maintenanceService.upcomingDue();
    return sendSuccess(res, 200, { message: 'Upcoming service due fetched', data: records });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const record = await maintenanceService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Maintenance record fetched', data: record });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await maintenanceService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Maintenance record created', data: record });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const record = await maintenanceService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Maintenance record updated', data: record });
  }),
  uploadBill: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }
    const record = await maintenanceService.setAttachment(
      req.params.id,
      'billDocument',
      `/uploads/documents/${req.file.filename}`,
      req.user!.userId
    );
    return sendSuccess(res, 200, { message: 'Bill uploaded', data: record });
  }),
  uploadAccidentPhoto: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }
    const record = await maintenanceService.setAttachment(
      req.params.id,
      'accidentPhoto',
      `/uploads/documents/${req.file.filename}`,
      req.user!.userId
    );
    return sendSuccess(res, 200, { message: 'Accident photo uploaded', data: record });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await maintenanceService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Maintenance record deleted' });
  }),
};
