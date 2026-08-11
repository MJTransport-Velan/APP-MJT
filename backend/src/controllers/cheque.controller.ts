import { Response } from 'express';
import { chequeService } from '../services/cheque.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const chequeController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await chequeService.list(req.query);
    return sendSuccess(res, 200, { message: 'Cheques fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const cheque = await chequeService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Cheque fetched', data: cheque });
  }),
  issue: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cheque = await chequeService.issue(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Cheque issued', data: cheque });
  }),
  receive: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cheque = await chequeService.receive(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Cheque recorded as received', data: cheque });
  }),
  deposit: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cheque = await chequeService.deposit(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Cheque deposited', data: cheque });
  }),
  markPresented: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cheque = await chequeService.markPresented(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Cheque marked as presented', data: cheque });
  }),
  clear: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cheque = await chequeService.clear(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Cheque cleared', data: cheque });
  }),
  bounce: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cheque = await chequeService.bounce(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Cheque bounced', data: cheque });
  }),
  cancel: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cheque = await chequeService.cancel(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Cheque cancelled', data: cheque });
  }),
  stopPayment: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cheque = await chequeService.stopPayment(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Stop payment recorded', data: cheque });
  }),
};
