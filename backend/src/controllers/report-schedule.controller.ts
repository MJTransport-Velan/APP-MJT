import { Response } from 'express';
import { reportScheduleService } from '../services/report-schedule.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const reportScheduleController = {
  list: asyncHandler(async (req, res: Response) => {
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const schedules = await reportScheduleService.list(isActive, req.query.category as string | undefined);
    return sendSuccess(res, 200, { message: 'Report Schedules fetched', data: schedules });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const schedule = await reportScheduleService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Report Schedule fetched', data: schedule });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const schedule = await reportScheduleService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Report Schedule created', data: schedule });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const schedule = await reportScheduleService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Report Schedule updated', data: schedule });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await reportScheduleService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Report Schedule deleted' });
  }),
};
