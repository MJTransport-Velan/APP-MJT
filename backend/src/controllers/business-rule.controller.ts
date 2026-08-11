import { Response } from 'express';
import { businessRuleService } from '../services/business-rule.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const businessRuleController = {
  list: asyncHandler(async (req, res: Response) => {
    const data = await businessRuleService.list(req.query.ruleType as string | undefined);
    return sendSuccess(res, 200, { message: 'Business rules fetched', data });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await businessRuleService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Business rule created', data });
  }),
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await businessRuleService.update(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Business rule updated', data });
  }),
  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    await businessRuleService.remove(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Business rule deleted' });
  }),
};
