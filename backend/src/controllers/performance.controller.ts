import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { performanceService } from '../services/performance.service';
import { parseReportFilters } from '../utils/reportFilters';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const performanceController = {
  me: asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = parseReportFilters(req.query);
    const data = await performanceService.getMyPerformance(req.user!.userId, req.user!.roles, filters);
    return sendSuccess(res, 200, { message: 'Performance report fetched', data });
  }),

  team: asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = parseReportFilters(req.query);
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const team = ((req.query.team as string) || 'all') as 'all' | 'operations' | 'accounts';
    const search = (req.query.search as string) || undefined;

    const { rows, total } = await performanceService.getTeamPerformance({ team, search, filters, skip, take });

    return sendSuccess(res, 200, {
      message: 'Team performance report fetched',
      data: rows,
      meta: buildPaginationMeta(page, pageSize, total),
    });
  }),
};
