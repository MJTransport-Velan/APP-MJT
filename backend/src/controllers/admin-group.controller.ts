import { Response } from 'express';
import { adminGroupService } from '../services/admin-group.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const adminGroupController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await adminGroupService.list(req.query);
    return sendSuccess(res, 200, { message: 'Groups fetched', data: result.data, meta: result.meta });
  }),

  getById: asyncHandler(async (req, res: Response) => {
    const group = await adminGroupService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Group fetched', data: group });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const group = await adminGroupService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Group created', data: group });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const group = await adminGroupService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Group updated', data: group });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await adminGroupService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Group deleted' });
  }),

  setMembers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const group = await adminGroupService.setMembers(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Group members updated', data: group });
  }),

  removeMember: asyncHandler(async (req: AuthRequest, res: Response) => {
    const group = await adminGroupService.removeMember(req.params.id, req.params.userId, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Group member removed', data: group });
  }),

  setCompanies: asyncHandler(async (req: AuthRequest, res: Response) => {
    const group = await adminGroupService.setCompanies(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Group companies updated', data: group });
  }),
};
