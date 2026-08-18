import { Response } from 'express';
import { vehicleAssignmentService } from '../services/vehicle-assignment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const vehicleAssignmentController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await vehicleAssignmentService.list(req.query);
    return sendSuccess(res, 200, { message: 'Assignments fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const assignment = await vehicleAssignmentService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Assignment fetched', data: assignment });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignment = await vehicleAssignmentService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Vehicle assigned successfully', data: assignment });
  }),
  complete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignment = await vehicleAssignmentService.complete(req.params.id, req.body.notes, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Assignment completed', data: assignment });
  }),
  cancel: asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignment = await vehicleAssignmentService.cancel(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Assignment cancelled', data: assignment });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignment = await vehicleAssignmentService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Assignment updated', data: assignment });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await vehicleAssignmentService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Assignment deleted' });
  }),
};
