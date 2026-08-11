import { Response } from 'express';
import { tripDocumentService } from '../services/trip-document.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const tripDocumentController = {
  list: asyncHandler(async (req, res: Response) => {
    const tripId = req.query.tripId as string | undefined;
    const type = req.query.type as string | undefined;
    const docs = await tripDocumentService.list(tripId, type);
    return sendSuccess(res, 200, { message: 'Trip documents fetched', data: docs });
  }),
  upload: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const doc = await tripDocumentService.upload(req.body, fileUrl, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Document uploaded', data: doc });
  }),
  verify: asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await tripDocumentService.verify(req.params.id, req.body.status, req.body.remarks, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Document status updated', data: doc });
  }),
};
