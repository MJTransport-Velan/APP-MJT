import { Response } from 'express';
import { systemExceptionService } from '../services/system-exception.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const systemExceptionController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await systemExceptionService.list(req.query as Record<string, string>);
    return sendSuccess(res, 200, { message: 'Exceptions fetched', data: result.data, meta: result.meta });
  }),
  acknowledge: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await systemExceptionService.acknowledge(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Exception acknowledged', data });
  }),
  resolve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await systemExceptionService.resolve(req.params.id, req.user!.userId, req.body.resolution);
    return sendSuccess(res, 200, { message: 'Exception resolved', data });
  }),
};
