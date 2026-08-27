import { Response } from 'express';
import { salaryStructureService } from '../services/salary-structure.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const salaryStructureController = {
  listForEmployee: asyncHandler(async (req, res: Response) => {
    const structures = await salaryStructureService.listForEmployee(req.params.employeeId);
    return sendSuccess(res, 200, { message: 'Salary Structures fetched', data: structures });
  }),
  getActiveForEmployee: asyncHandler(async (req, res: Response) => {
    const structure = await salaryStructureService.getActiveForEmployee(req.params.employeeId);
    return sendSuccess(res, 200, { message: 'Active Salary Structure fetched', data: structure });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const structure = await salaryStructureService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Salary Structure fetched', data: structure });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const structure = await salaryStructureService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Salary Structure created', data: structure });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const structure = await salaryStructureService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Salary Structure updated', data: structure });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await salaryStructureService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Salary Structure deleted' });
  }),
};
