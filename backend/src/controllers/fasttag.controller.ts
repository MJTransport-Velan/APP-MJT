import { Response } from 'express';
import { fastTagService } from '../services/fasttag.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

export const fastTagController = {
  getWallet: asyncHandler(async (req: AuthRequest, res: Response) => {
    const wallet = await fastTagService.getWallet(req.user!.userId);
    return sendSuccess(res, 200, { message: 'FastTag wallet fetched', data: wallet });
  }),
  walletSummary: asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await fastTagService.walletSummary(req.user!.userId);
    return sendSuccess(res, 200, { message: 'FastTag wallet summary fetched', data: summary });
  }),
  listTransactions: asyncHandler(async (req, res: Response) => {
    const result = await fastTagService.listTransactions(req.query);
    return sendSuccess(res, 200, { message: 'FastTag Transactions fetched', data: result.data, meta: result.meta });
  }),
  recharge: asyncHandler(async (req: AuthRequest, res: Response) => {
    const wallet = await fastTagService.recharge(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'FastTag wallet recharged', data: wallet });
  }),
  logUsage: asyncHandler(async (req: AuthRequest, res: Response) => {
    const wallet = await fastTagService.logUsage(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'FastTag usage logged', data: wallet });
  }),
  refund: asyncHandler(async (req: AuthRequest, res: Response) => {
    const wallet = await fastTagService.refund(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'FastTag refund recorded', data: wallet });
  }),
  adjust: asyncHandler(async (req: AuthRequest, res: Response) => {
    const wallet = await fastTagService.adjust(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'FastTag wallet balance adjusted', data: wallet });
  }),
  updateTransaction: asyncHandler(async (req: AuthRequest, res: Response) => {
    const transaction = await fastTagService.updateTransaction(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'FastTag transaction updated', data: transaction });
  }),
  deleteTransaction: asyncHandler(async (req: AuthRequest, res: Response) => {
    await fastTagService.deleteTransaction(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'FastTag transaction deleted', data: null });
  }),
  updateTransactionStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const transaction = await fastTagService.updateTransactionStatus(req.params.id, req.body.status, req.body.remarks, req.user!.userId);
    return sendSuccess(res, 200, { message: 'FastTag transaction status updated', data: transaction });
  }),
  uploadAttachment: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) throw new AppError('No attachment uploaded', 400);
    const transaction = await fastTagService.setAttachment(req.params.id, `/uploads/documents/${req.file.filename}`, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Attachment uploaded', data: transaction });
  }),
};
