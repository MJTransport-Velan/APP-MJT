import { Response } from 'express';
import { adBlueStockService } from '../services/adblue-stock.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const adBlueStockController = {
  getStock: asyncHandler(async (req: AuthRequest, res: Response) => {
    const stock = await adBlueStockService.getStock(req.user!.userId);
    return sendSuccess(res, 200, { message: 'AdBlue stock fetched', data: stock });
  }),
  stockSummary: asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await adBlueStockService.stockSummary(req.user!.userId);
    return sendSuccess(res, 200, { message: 'AdBlue stock summary fetched', data: summary });
  }),
  listTransactions: asyncHandler(async (req, res: Response) => {
    const result = await adBlueStockService.listTransactions(req.query);
    return sendSuccess(res, 200, { message: 'AdBlue stock movements fetched', data: result.data, meta: result.meta });
  }),
  purchase: asyncHandler(async (req: AuthRequest, res: Response) => {
    const stock = await adBlueStockService.purchase(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'AdBlue stock purchase recorded', data: stock });
  }),
  returnToSupplier: asyncHandler(async (req: AuthRequest, res: Response) => {
    const stock = await adBlueStockService.returnToSupplier(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'AdBlue stock return recorded', data: stock });
  }),
  adjust: asyncHandler(async (req: AuthRequest, res: Response) => {
    const stock = await adBlueStockService.adjust(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'AdBlue stock adjusted', data: stock });
  }),
  updateTransaction: asyncHandler(async (req: AuthRequest, res: Response) => {
    const transaction = await adBlueStockService.updateTransaction(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'AdBlue stock movement updated', data: transaction });
  }),
  deleteTransaction: asyncHandler(async (req: AuthRequest, res: Response) => {
    await adBlueStockService.deleteTransaction(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'AdBlue stock movement deleted', data: null });
  }),
};
