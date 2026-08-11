import { Response } from 'express';
import { organizationService } from '../services/organization.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const organizationController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await organizationService.list(req.query);
    return sendSuccess(res, 200, { message: 'Organizations fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const org = await organizationService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Organization fetched', data: org });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await organizationService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Organization created', data: org });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await organizationService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Organization updated', data: org });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await organizationService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Organization status updated', data: org });
  }),
};
