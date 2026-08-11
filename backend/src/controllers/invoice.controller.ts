import { Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const invoiceController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await invoiceService.list(req.query, req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Invoices fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await invoiceService.getById(req.params.id, req.user?.roles, req.user?.userId);
    return sendSuccess(res, 200, { message: 'Invoice fetched', data: invoice });
  }),
  generate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await invoiceService.generate(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Invoice generated', data: invoice });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await invoiceService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Invoice updated', data: invoice });
  }),
  send: asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await invoiceService.send(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Invoice marked as sent', data: invoice });
  }),
  cancel: asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await invoiceService.cancel(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Invoice cancelled', data: invoice });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await invoiceService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Invoice deleted' });
  }),
  addCreditNote: asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await invoiceService.addCreditNote(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Credit note issued', data: invoice });
  }),
  addDebitNote: asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await invoiceService.addDebitNote(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Debit note issued', data: invoice });
  }),
};
