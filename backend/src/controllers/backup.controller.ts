import { Response } from 'express';
import { backupService } from '../services/backup.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const backupController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await backupService.list(req.query as { page?: string; pageSize?: string });
    return sendSuccess(res, 200, { message: 'Backup records fetched', data: result.data, meta: result.meta });
  }),
  runManual: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await backupService.runBackup('MANUAL', req.user!.userId);
    return sendSuccess(res, 201, { message: data.status === 'SUCCESS' ? 'Backup completed' : 'Backup failed', data });
  }),
  verify: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await backupService.verify(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: data.verificationPassed ? 'Restore validation passed' : 'Restore validation failed', data });
  }),
  latestStatus: asyncHandler(async (_req, res: Response) => {
    const data = await backupService.latestStatus();
    return sendSuccess(res, 200, { message: 'Latest backup status fetched', data });
  }),
};
