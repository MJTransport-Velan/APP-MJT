import { Response } from 'express';
import { systemSettingService } from '../services/system-setting.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const systemSettingController = {
  list: asyncHandler(async (req, res: Response) => {
    const data = await systemSettingService.list(req.query.category as string | undefined);
    return sendSuccess(res, 200, { message: 'System settings fetched', data });
  }),
  set: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category, key, value, description } = req.body;
    const setting = await systemSettingService.set(category, key, value, description, req.user!.userId);
    return sendSuccess(res, 200, { message: 'System setting saved', data: setting });
  }),
};
