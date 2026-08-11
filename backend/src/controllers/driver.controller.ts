import { Response } from 'express';
import { driverService } from '../services/driver.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const driverController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await driverService.list(req.query);
    return sendSuccess(res, 200, { message: 'Drivers fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const driver = await driverService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Driver fetched', data: driver });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const driver = await driverService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Driver created', data: driver });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const driver = await driverService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver updated', data: driver });
  }),
  uploadLicense: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No license document uploaded', 400);
    }
    const filePath = `/uploads/documents/${req.file.filename}`;
    const driver = await driverService.setLicenseDocument(req.params.id, filePath, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver license document updated', data: driver });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const driver = await driverService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver status updated', data: driver });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await driverService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Driver deleted' });
  }),
};
