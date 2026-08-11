import { Response } from 'express';
import { adminRoleService } from '../services/admin-role.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const adminRoleController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await adminRoleService.list(req.query);
    return sendSuccess(res, 200, { message: 'Roles fetched', data: result.data, meta: result.meta });
  }),

  getById: asyncHandler(async (req, res: Response) => {
    const role = await adminRoleService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Role fetched', data: role });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const role = await adminRoleService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Role created', data: role });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const role = await adminRoleService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Role updated', data: role });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await adminRoleService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Role deleted' });
  }),

  clone: asyncHandler(async (req: AuthRequest, res: Response) => {
    const role = await adminRoleService.clone(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Role cloned', data: role });
  }),

  assignPermissions: asyncHandler(async (req: AuthRequest, res: Response) => {
    const role = await adminRoleService.assignPermissions(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Role permissions updated', data: role });
  }),
};
