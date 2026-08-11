import { Response } from 'express';
import { auditReportService } from '../services/audit-report.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const auditReportController = {
  userActivity: asyncHandler(async (req, res: Response) => {
    const result = await auditReportService.userActivity(req.query);
    return sendSuccess(res, 200, { message: 'User Activity fetched', data: result.data, meta: result.meta });
  }),
};
