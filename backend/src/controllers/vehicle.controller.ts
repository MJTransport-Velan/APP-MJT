import { Response } from 'express';
import { vehicleService } from '../services/vehicle.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const vehicleController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await vehicleService.list(req.query, req.user?.roles);
    return sendSuccess(res, 200, { message: 'Vehicles fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vehicle = await vehicleService.getById(req.params.id, req.user?.roles);
    return sendSuccess(res, 200, { message: 'Vehicle fetched', data: vehicle });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vehicle = await vehicleService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Vehicle created', data: vehicle });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vehicle = await vehicleService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Vehicle updated', data: vehicle });
  }),
  uploadDocuments: asyncHandler(async (req: AuthRequest, res: Response) => {
    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    if (!files || Object.keys(files).length === 0) {
      return sendSuccess(res, 400, { message: 'No documents uploaded' });
    }

    const payload: { rcDocument?: string; insuranceDocument?: string; permitDocument?: string } = {};
    if (files.rcDocument?.[0]) payload.rcDocument = `/uploads/documents/${files.rcDocument[0].filename}`;
    if (files.insuranceDocument?.[0])
      payload.insuranceDocument = `/uploads/documents/${files.insuranceDocument[0].filename}`;
    if (files.permitDocument?.[0]) payload.permitDocument = `/uploads/documents/${files.permitDocument[0].filename}`;

    const vehicle = await vehicleService.setDocuments(req.params.id, payload, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Vehicle documents updated', data: vehicle });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vehicle = await vehicleService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Vehicle status updated', data: vehicle });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await vehicleService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Vehicle deleted' });
  }),
};
