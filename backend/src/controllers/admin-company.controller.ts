import { Response } from 'express';
import { adminCompanyService } from '../services/admin-company.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const adminCompanyController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await adminCompanyService.list(req.query, req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Companies fetched', data: result.data, meta: result.meta });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const company = await adminCompanyService.getById(req.params.id, req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Company fetched', data: company });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const company = await adminCompanyService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Company created', data: company });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const company = await adminCompanyService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Company updated', data: company });
  }),

  uploadLogo: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No logo file uploaded', 400);
    }
    const logoPath = `/uploads/profile-photos/${req.file.filename}`;
    const company = await adminCompanyService.setLogo(req.params.id, logoPath, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Company logo updated', data: company });
  }),

  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const company = await adminCompanyService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Company status updated', data: company });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await adminCompanyService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Company deleted' });
  }),
};
