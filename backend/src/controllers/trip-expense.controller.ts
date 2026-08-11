import { Response } from 'express';
import { tripExpenseService } from '../services/trip-expense.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const tripExpenseController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await tripExpenseService.list(req.query);
    return sendSuccess(res, 200, { message: 'Trip expenses fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const expense = await tripExpenseService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Trip expense fetched', data: expense });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await tripExpenseService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Trip expense recorded', data: expense });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await tripExpenseService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Trip expense updated', data: expense });
  }),
  uploadBill: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No bill document uploaded', 400);
    }
    const expense = await tripExpenseService.setBillDocument(
      req.params.id,
      `/uploads/documents/${req.file.filename}`,
      req.user!.userId
    );
    return sendSuccess(res, 200, { message: 'Bill document uploaded', data: expense });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await tripExpenseService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Trip expense deleted' });
  }),
};
