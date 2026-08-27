import { Response } from 'express';
import { supplierBillService } from '../services/supplier-bill.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const supplierBillController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await supplierBillService.list(req.query);
    return sendSuccess(res, 200, { message: 'Supplier Bills fetched', data: result.data, meta: result.meta });
  }),
  getById: asyncHandler(async (req, res: Response) => {
    const bill = await supplierBillService.getById(req.params.id);
    return sendSuccess(res, 200, { message: 'Supplier Bill fetched', data: bill });
  }),
  generate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const bill = await supplierBillService.generate(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Supplier Bill generated', data: bill });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const bill = await supplierBillService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier Bill updated', data: bill });
  }),
  cancel: asyncHandler(async (req: AuthRequest, res: Response) => {
    const bill = await supplierBillService.cancel(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier Bill cancelled', data: bill });
  }),
  addCreditNote: asyncHandler(async (req: AuthRequest, res: Response) => {
    const bill = await supplierBillService.addCreditNote(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Supplier credit note issued', data: bill });
  }),
  addDebitNote: asyncHandler(async (req: AuthRequest, res: Response) => {
    const bill = await supplierBillService.addDebitNote(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Supplier debit note issued', data: bill });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await supplierBillService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Supplier Bill deleted', data: null });
  }),
};
