import { Response } from 'express';
import { vehicleFleetService } from '../services/vehicle-fleet.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const vehicleFleetController = {
  tracking: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vehicles = await vehicleFleetService.trackingList(req.user?.roles);
    return sendSuccess(res, 200, { message: 'Vehicle tracking list fetched', data: vehicles });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vehicle = await vehicleFleetService.getById(req.params.id, req.user?.roles);
    return sendSuccess(res, 200, { message: 'Vehicle fetched', data: vehicle });
  }),

  availability: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await vehicleFleetService.checkAvailability(req.params.id, req.user?.roles);
    return sendSuccess(res, 200, { message: 'Availability checked', data: result });
  }),

  timeline: asyncHandler(async (req: AuthRequest, res: Response) => {
    const events = await vehicleFleetService.timeline(req.params.id, req.user?.roles);
    return sendSuccess(res, 200, { message: 'Vehicle timeline fetched', data: events });
  }),

  setStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vehicle = await vehicleFleetService.setStatus(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Vehicle status updated', data: vehicle });
  }),

  updateCompliance: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vehicle = await vehicleFleetService.updateCompliance(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Vehicle compliance details updated', data: vehicle });
  }),

  uploadPhoto: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }
    const vehicle = await vehicleFleetService.setDocument(
      req.params.id,
      'photo',
      `/uploads/profile-photos/${req.file.filename}`,
      req.user!.userId
    );
    return sendSuccess(res, 200, { message: 'Vehicle photo updated', data: vehicle });
  }),

  uploadFitness: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }
    const vehicle = await vehicleFleetService.setDocument(
      req.params.id,
      'fitnessDocument',
      `/uploads/documents/${req.file.filename}`,
      req.user!.userId
    );
    return sendSuccess(res, 200, { message: 'Fitness certificate updated', data: vehicle });
  }),

  uploadPuc: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }
    const vehicle = await vehicleFleetService.setDocument(
      req.params.id,
      'pucDocument',
      `/uploads/documents/${req.file.filename}`,
      req.user!.userId
    );
    return sendSuccess(res, 200, { message: 'PUC certificate updated', data: vehicle });
  }),
};
