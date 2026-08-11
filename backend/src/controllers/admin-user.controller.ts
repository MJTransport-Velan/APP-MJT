import { Response } from 'express';
import { adminUserService } from '../services/admin-user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const adminUserController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await adminUserService.list(req.query);
    return sendSuccess(res, 200, { message: 'Users fetched', data: result.data, meta: result.meta });
  }),

  getById: asyncHandler(async (req, res: Response) => {
    const user = await adminUserService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'User fetched', data: user });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await adminUserService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'User created', data: user });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await adminUserService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'User updated', data: user });
  }),

  activate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await adminUserService.setActive(req.params.id, true, req.user!.userId);
    return sendSuccess(res, 200, { message: 'User activated', data: user });
  }),

  deactivate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await adminUserService.setActive(req.params.id, false, req.user!.userId);
    return sendSuccess(res, 200, { message: 'User deactivated', data: user });
  }),

  resetPassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    await adminUserService.resetPassword(req.params.id, req.body.newPassword, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Password reset successfully' });
  }),

  uploadPhoto: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No photo file uploaded', 400);
    }
    const relativePath = `/uploads/profile-photos/${req.file.filename}`;
    const user = await adminUserService.uploadPhoto(req.params.id, relativePath, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Profile photo updated', data: user });
  }),
};
