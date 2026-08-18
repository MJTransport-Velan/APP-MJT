import { Response } from 'express';
import { driverSalaryStructureService } from '../services/driver-salary-structure.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const driverSalaryStructureController = {
  listForDriver: asyncHandler(async (req, res: Response) => {
    const rows = await driverSalaryStructureService.listForDriver(req.params.driverId);
    return sendSuccess(res, 200, { message: 'Salary structures fetched', data: rows });
  }),
  getActiveForDriver: asyncHandler(async (req, res: Response) => {
    const structure = await driverSalaryStructureService.getActiveForDriver(req.params.driverId);
    return sendSuccess(res, 200, { message: 'Active salary structure fetched', data: structure });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const structure = await driverSalaryStructureService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Salary structure created', data: structure });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await driverSalaryStructureService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Salary structure deleted' });
  }),
};
