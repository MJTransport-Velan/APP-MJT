import { Response } from 'express';
import { supplierService } from '../services/supplier.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const supplierController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await supplierService.list(req.query);
    return sendSuccess(res, 200, { message: 'Suppliers fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const supplier = await supplierService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Supplier fetched', data: supplier });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const supplier = await supplierService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Supplier created', data: supplier });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const supplier = await supplierService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier updated', data: supplier });
  }),
  uploadDocument: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No document uploaded', 400);
    }
    const filePath = `/uploads/documents/${req.file.filename}`;
    const supplier = await supplierService.setDocument(req.params.id, filePath, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier document updated', data: supplier });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const supplier = await supplierService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier status updated', data: supplier });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await supplierService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier deleted' });
  }),
};
