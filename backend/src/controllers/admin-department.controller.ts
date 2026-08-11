import { Response } from 'express';
import { adminDepartmentService } from '../services/admin-department.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const adminDepartmentController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await adminDepartmentService.list(req.query);
    return sendSuccess(res, 200, { message: 'Departments fetched', data: result.data, meta: result.meta });
  }),

  getById: asyncHandler(async (req, res: Response) => {
    const department = await adminDepartmentService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Department fetched', data: department });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const department = await adminDepartmentService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Department created', data: department });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const department = await adminDepartmentService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Department updated', data: department });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await adminDepartmentService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Department deleted' });
  }),
};
