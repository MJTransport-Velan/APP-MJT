import { Response } from 'express';
import { adminAuditService } from '../services/admin-audit.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const adminAuditController = {
  list: asyncHandler(async (req, res: Response) => {
    const result = await adminAuditService.list(req.query);
    return sendSuccess(res, 200, { message: 'Audit logs fetched', data: result.data, meta: result.meta });
  }),
};
