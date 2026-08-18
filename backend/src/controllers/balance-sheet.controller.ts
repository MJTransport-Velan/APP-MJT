import { Response } from 'express';
import { balanceSheetService } from '../services/balance-sheet.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const balanceSheetController = {
  get: asyncHandler(async (req, res: Response) => {
    const result = await balanceSheetService.get(req.query.asOfDate as string | undefined);
    return sendSuccess(res, 200, { message: 'Balance Sheet fetched', data: result });
  }),
};
