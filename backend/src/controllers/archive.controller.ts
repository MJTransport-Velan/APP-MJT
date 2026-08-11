import { Response } from 'express';
import { archiveService } from '../services/archive.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ArchiveScope } from '@prisma/client';

export const archiveController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await archiveService.list(req.query as { page?: string; pageSize?: string; scope?: string });
    return sendSuccess(res, 200, { message: 'Archive runs fetched', data: result.data, meta: result.meta });
  }),
  run: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { scope, cutoffDays } = req.body as { scope: ArchiveScope; cutoffDays: number };
    const actorId = req.user!.userId;
    const data = await archiveService.archiveLogs(scope, cutoffDays, actorId);
    return sendSuccess(res, 201, { message: 'Archive run complete', data });
  }),
};
