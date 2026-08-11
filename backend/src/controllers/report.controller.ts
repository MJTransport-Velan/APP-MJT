import { Response } from 'express';
import { reportService } from '../services/report.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

async function runCategory(category: 'operations' | 'fleet' | 'accounts' | 'management', req: Parameters<typeof reportService.run>[1], res: Response) {
  const result = await reportService.run(category, req);
  return sendSuccess(res, 200, {
    message: `${result.label} fetched`,
    data: result.data,
    meta: { ...result.meta, columns: result.columns, label: result.label },
  });
}

export const reportController = {
  listAvailable: asyncHandler(async (req, res: Response) => {
    const categories = reportService.listAvailable();
    return sendSuccess(res, 200, { message: 'Available reports fetched', data: categories });
  }),
  operations: asyncHandler(async (req, res: Response) => runCategory('operations', req, res)),
  fleet: asyncHandler(async (req, res: Response) => runCategory('fleet', req, res)),
  accounts: asyncHandler(async (req, res: Response) => runCategory('accounts', req, res)),
  management: asyncHandler(async (req, res: Response) => runCategory('management', req, res)),
  export: asyncHandler(async (req, res: Response) => {
    await reportService.export(res, req);
  }),
};
