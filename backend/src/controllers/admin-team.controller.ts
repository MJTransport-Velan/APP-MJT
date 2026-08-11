import { Response } from 'express';
import { adminTeamService } from '../services/admin-team.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const adminTeamController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await adminTeamService.list(req.query);
    return sendSuccess(res, 200, { message: 'Teams fetched', data: result.data, meta: result.meta });
  }),

  getById: asyncHandler(async (req, res: Response) => {
    const team = await adminTeamService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Team fetched', data: team });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const team = await adminTeamService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Team created', data: team });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const team = await adminTeamService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Team updated', data: team });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await adminTeamService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Team deleted' });
  }),

  assignMembers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const team = await adminTeamService.assignMembers(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Team members updated', data: team });
  }),
};
