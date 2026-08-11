import { Response } from 'express';
import { enterpriseAuditService } from '../services/enterprise-audit.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const enterpriseAuditController = {
  overview: asyncHandler(async (_req, res: Response) => {
    const data = await enterpriseAuditService.overview();
    return sendSuccess(res, 200, { message: 'Audit overview fetched', data });
  }),
  loginAudit: asyncHandler(async (req, res: Response) => {
    const result = await enterpriseAuditService.loginAudit(req.query as never);
    return sendSuccess(res, 200, { message: 'Login audit fetched', data: result.data, meta: result.meta });
  }),
  configurationAudit: asyncHandler(async (req, res: Response) => {
    const result = await enterpriseAuditService.configurationAudit(req.query as never);
    return sendSuccess(res, 200, { message: 'Configuration audit fetched', data: result.data, meta: result.meta });
  }),
  exportAudit: asyncHandler(async (req, res: Response) => {
    const result = await enterpriseAuditService.exportAudit(req.query as never);
    return sendSuccess(res, 200, { message: 'Export audit fetched', data: result.data, meta: result.meta });
  }),
  apiAudit: asyncHandler(async (req, res: Response) => {
    const result = await enterpriseAuditService.apiAudit(req.query as never);
    return sendSuccess(res, 200, { message: 'API audit fetched', data: result.data, meta: result.meta });
  }),
  recentActivity: asyncHandler(async (req, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const data = await enterpriseAuditService.recentActivityFeed(limit);
    return sendSuccess(res, 200, { message: 'Recent activity feed fetched', data });
  }),
};
