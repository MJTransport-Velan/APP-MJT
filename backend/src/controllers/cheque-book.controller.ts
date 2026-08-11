import { Response } from 'express';
import { chequeBookService } from '../services/cheque-book.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const chequeBookController = {
  list: asyncHandler(async (req, res: Response) => {
    const rows = await chequeBookService.list(req.query.organizationId as string | undefined, {
      bankAccountId: req.query.bankAccountId as string | undefined,
      isActive: req.query.isActive as string | undefined,
    });
    return sendSuccess(res, 200, { message: 'Cheque Books fetched', data: rows });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const chequeBook = await chequeBookService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Cheque Book created', data: chequeBook });
  }),
  nextAvailable: asyncHandler(async (req, res: Response) => {
    const next = await chequeBookService.nextAvailableNumber(req.params.id);
    return sendSuccess(res, 200, { message: 'Next available cheque number', data: { nextNumber: next } });
  }),
  toggleStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const chequeBook = await chequeBookService.toggleStatus(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Cheque Book status updated', data: chequeBook });
  }),
};
