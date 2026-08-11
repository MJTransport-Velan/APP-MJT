import { Response } from 'express';
import { tripNoteService } from '../services/trip-note.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const tripNoteController = {
  list: asyncHandler(async (req, res: Response) => {
    const notes = await tripNoteService.list(req.query.tripId as string);
    return sendSuccess(res, 200, { message: 'Trip notes fetched', data: notes });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const note = await tripNoteService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Note added', data: note });
  }),
};
