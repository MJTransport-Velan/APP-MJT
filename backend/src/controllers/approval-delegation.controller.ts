import { Response } from 'express';
import { approvalDelegationService } from '../services/approval-delegation.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const approvalDelegationController = {
  list: asyncHandler(async (_req, res: Response) => {
    const data = await approvalDelegationService.list();
    return sendSuccess(res, 200, { message: 'Approval delegations fetched', data });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await approvalDelegationService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'Approval delegation created', data });
  }),
  revoke: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await approvalDelegationService.revoke(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Approval delegation revoked', data });
  }),
};
