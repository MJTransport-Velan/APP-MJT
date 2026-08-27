import { Response } from 'express';
import { openingBalanceService } from '../services/opening-balance.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const openingBalanceController = {
  getMigration: asyncHandler(async (_req, res: Response) => {
    const data = await openingBalanceService.getMigration();
    return sendSuccess(res, 200, { message: 'Migration fetched', data });
  }),
  saveMigration: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await openingBalanceService.saveMigration(req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Migration saved', data });
  }),
  finalize: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await openingBalanceService.finalize(req.user!.userId);
    return sendSuccess(res, 200, { message: 'Opening position finalized', data });
  }),
  reopen: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await openingBalanceService.reopen(req.user!.userId);
    return sendSuccess(res, 200, { message: 'Migration reopened', data });
  }),
  list: asyncHandler(async (req, res: Response) => {
    const result = await openingBalanceService.listEntries(req.query);
    return sendSuccess(res, 200, { message: 'Opening balances fetched', data: result });
  }),
  summary: asyncHandler(async (_req, res: Response) => {
    const data = await openingBalanceService.summary();
    return sendSuccess(res, 200, { message: 'Migration summary fetched', data });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await openingBalanceService.createEntry(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Opening balance recorded', data });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await openingBalanceService.updateEntry(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Opening balance updated', data });
  }),
  reclassify: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await openingBalanceService.reclassify(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Opening amount reclassified', data });
  }),
  setStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await openingBalanceService.setStatus(req.params.id, req.body.status, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Status updated', data });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await openingBalanceService.removeEntry(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Opening balance deleted' });
  }),
};
