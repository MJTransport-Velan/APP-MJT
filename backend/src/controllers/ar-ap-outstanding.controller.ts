import { Response } from 'express';
import { arApOutstandingService } from '../services/ar-ap-outstanding.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { partyOutstandingService } from '../services/party-outstanding.service';
import { parseDateRange } from '../utils/dateRange';

export const arApOutstandingController = {
  /**
   * Party-grouped outstanding with the opening balance broken out. The
   * Outstanding tabs used to group invoices client-side, which meant they
   * could not see opening balances at all — they live in a different table.
   */
  customerSummary: asyncHandler(async (req, res: Response) => {
    const rows = await partyOutstandingService.customerRows(parseDateRange(req.query));
    const totals = {
      opening: rows.reduce((s, r) => s + r.opening, 0),
      current: rows.reduce((s, r) => s + r.current, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
    };
    return sendSuccess(res, 200, { message: 'Customer outstanding summary fetched', data: rows, meta: { totals } });
  }),
  supplierSummary: asyncHandler(async (req, res: Response) => {
    const rows = await partyOutstandingService.supplierRows(parseDateRange(req.query));
    const totals = {
      opening: rows.reduce((s, r) => s + r.opening, 0),
      current: rows.reduce((s, r) => s + r.current, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
    };
    return sendSuccess(res, 200, { message: 'Supplier outstanding summary fetched', data: rows, meta: { totals } });
  }),
  customerOutstanding: asyncHandler(async (req, res: Response) => {
    const rows = await arApOutstandingService.customerOutstanding(req.params.id);
    return sendSuccess(res, 200, { message: 'Customer outstanding fetched', data: rows });
  }),
  supplierOutstanding: asyncHandler(async (req, res: Response) => {
    const rows = await arApOutstandingService.supplierOutstanding(req.params.id);
    return sendSuccess(res, 200, { message: 'Supplier outstanding fetched', data: rows });
  }),
  customerAging: asyncHandler(async (req, res: Response) => {
    const rows = await arApOutstandingService.customerAging();
    return sendSuccess(res, 200, { message: 'Customer aging fetched', data: rows });
  }),
  supplierAging: asyncHandler(async (req, res: Response) => {
    const rows = await arApOutstandingService.supplierAging();
    return sendSuccess(res, 200, { message: 'Supplier aging fetched', data: rows });
  }),
};
