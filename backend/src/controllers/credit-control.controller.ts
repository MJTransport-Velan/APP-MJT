import { Response } from 'express';
import { prisma } from '../config/db';
import { creditControlService } from '../services/credit-control.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';
import { partyOutstandingService } from '../services/party-outstanding.service';

export const creditControlController = {
  get: asyncHandler(async (req, res: Response) => {
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true, name: true, creditLimit: true, creditDays: true, isBlocked: true, blockedReason: true, blockedAt: true },
    });
    if (!company) throw new AppError('Company not found', 404);
    // Broken out so the screen can say how much of the exposure is migrated
    // debt rather than showing one figure the user cannot reconcile.
    const outstanding = await partyOutstandingService.customerTotal(req.params.id);
    return sendSuccess(res, 200, {
      message: 'Credit control fetched',
      data: {
        ...company,
        liveOutstanding: outstanding.total,
        openingOutstanding: outstanding.opening,
        currentOutstanding: outstanding.current,
      },
    });
  }),
  set: asyncHandler(async (req: AuthRequest, res: Response) => {
    const company = await creditControlService.setCreditControl(req.params.id, req.body, req.user!.userId);
    return sendSuccess(res, 200, { message: 'Credit control updated', data: company });
  }),
};
