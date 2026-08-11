import { Response } from 'express';
import { branchService } from '../services/branch.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const branchController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await branchService.list(req.query);
    return sendSuccess(res, 200, { message: 'Branches fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const branch = await branchService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Branch fetched', data: branch });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const branch = await branchService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Branch created', data: branch });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const branch = await branchService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Branch updated', data: branch });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const branch = await branchService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Branch status updated', data: branch });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await branchService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Branch deleted' });
  }),
};
