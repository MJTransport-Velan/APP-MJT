import { Response } from 'express';
import { vehicleExpenseService } from '../services/vehicle-expense.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const vehicleExpenseController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await vehicleExpenseService.list(req.query);
    return sendSuccess(res, 200, { message: 'Expenses fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const expense = await vehicleExpenseService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Expense fetched', data: expense });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await vehicleExpenseService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Expense recorded', data: expense });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await vehicleExpenseService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Expense updated', data: expense });
  }),
  approve: asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await vehicleExpenseService.approve(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Expense approved and posted', data: expense });
  }),
  reject: asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await vehicleExpenseService.reject(req.params.id, req.user!.userId, req.body.reason);
    return sendSuccess(res, 200, { message: 'Expense rejected', data: expense });
  }),
  uploadBill: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No bill document uploaded', 400);
    }
    const expense = await vehicleExpenseService.setBillDocument(
      req.params.id,
      `/uploads/documents/${req.file.filename}`,
      req.user!.userId
    );
    return sendSuccess(res, 200, { message: 'Bill document uploaded', data: expense });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await vehicleExpenseService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Expense deleted' });
  }),
};
