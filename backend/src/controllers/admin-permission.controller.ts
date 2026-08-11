import { Response } from 'express';
import { adminPermissionService } from '../services/admin-permission.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const adminPermissionController = {
  list: asyncHandler(async (req, res: Response) => {
    const permissions = await adminPermissionService.list(req.query);
    return sendSuccess(res, 200, { message: 'Permissions fetched', data: permissions });
  }),

  grouped: asyncHandler(async (req, res: Response) => {
    const groups = await adminPermissionService.grouped();
    return sendSuccess(res, 200, { message: 'Permissions fetched grouped by module', data: groups });
  }),
};
