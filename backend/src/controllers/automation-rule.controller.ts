import { Response } from 'express';
import { automationRuleService } from '../services/automation-rule.service';
import { schedulerService } from '../services/scheduler.service';
import { organizationService } from '../services/organization.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const automationRuleController = {
  list: asyncHandler(async (_req, res: Response) => {
    const data = await automationRuleService.list();
    return sendSuccess(res, 200, { message: 'Automation rules fetched', data });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await automationRuleService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Automation rule created', data });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await automationRuleService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Automation rule updated', data });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await automationRuleService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Automation rule deleted' });
  }),
  runNow: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await automationRuleService.runNow(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Automation rule executed', data });
  }),
  runLogs: asyncHandler(async (req, res: Response) => {
    const result = await automationRuleService.runLogs(req.params.id, req.query as { page?: string; pageSize?: string });
    return sendSuccess(res, 200, { message: 'Run logs fetched', data: result.data, meta: result.meta });
  }),
  fireEvent: asyncHandler(async (req: AuthRequest, res: Response) => {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const data = await schedulerService.fireEvent(organizationId, req.body.eventCode);
    return sendSuccess(res, 200, { message: `Fired event "${req.body.eventCode}"`, data });
  }),
};
