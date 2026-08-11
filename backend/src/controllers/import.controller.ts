import { Response } from 'express';
import { ImportEntityType } from '@prisma/client';
import { importService } from '../services/import.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

export const importController = {
  run: asyncHandler(async (req: AuthRequest, res: Response) => {
    const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
    if (!file) throw new AppError('A file upload is required', 422);

    const data = await importService.runImport(req.body.entityType as ImportEntityType, file.originalname, file.buffer, req.user!.userId);
    return sendSuccess(res, 201, { message: `Import ${data.status}`, data });
  }),
  list: asyncHandler(async (req, res: Response) => {
    const result = await importService.list(req.query as { page?: string; pageSize?: string; entityType?: string });
    return sendSuccess(res, 200, { message: 'Import batches fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const data = await importService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Import batch fetched', data });
  }),
  sample: asyncHandler(async (req, res: Response) => {
    const { buffer, fileName } = await importService.generateSample(req.query.entityType as ImportEntityType);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }),
};
