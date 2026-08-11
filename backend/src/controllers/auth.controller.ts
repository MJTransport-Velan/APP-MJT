import { Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from '../services/audit.service';

export const authController = {
  login: asyncHandler(async (req, res: Response) => {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    await auditService.record({
      userId: result.user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: result.user.id,
      description: `User ${result.user.username} logged in`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, 200, { message: 'Login successful', data: result });
  }),

  logout: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user) {
      await authService.logout(req.user.userId);

      await auditService.record({
        userId: req.user.userId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: req.user.userId,
        description: `User ${req.user.username} logged out`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    return sendSuccess(res, 200, { message: 'Logout successful' });
  }),

  refresh: asyncHandler(async (req, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }
    const result = await authService.refresh(refreshToken);
    return sendSuccess(res, 200, { message: 'Token refreshed', data: result });
  }),

  me: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    const user = await authService.me(req.user.userId);
    return sendSuccess(res, 200, { message: 'Current user fetched', data: user });
  }),

  updateProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    const user = await authService.updateProfile(req.user.userId, req.body);

    await auditService.record({
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: req.user.userId,
      description: `User ${req.user.username} updated their profile`,
    });

    return sendSuccess(res, 200, { message: 'Profile updated', data: user });
  }),

  changePassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.userId, currentPassword, newPassword);

    await auditService.record({
      userId: req.user.userId,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: req.user.userId,
      description: `User ${req.user.username} changed their own password`,
    });

    return sendSuccess(res, 200, { message: 'Password changed successfully' });
  }),

  uploadPhoto: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    if (!req.file) {
      throw new AppError('No photo file uploaded', 400);
    }
    const relativePath = `/uploads/profile-photos/${req.file.filename}`;
    const user = await authService.setProfilePhoto(req.user.userId, relativePath);
    return sendSuccess(res, 200, { message: 'Profile photo updated', data: user });
  }),
};
