import { Response } from 'express';
import { mfaService } from '../services/mfa.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const mfaController = {
  status: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await mfaService.status(req.user!.userId);
    return sendSuccess(res, 200, { message: 'MFA status fetched', data });
  }),
  beginSetup: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await mfaService.beginSetup(req.user!.userId);
    return sendSuccess(res, 200, { message: 'Scan the QR code in your authenticator app, then verify', data });
  }),
  verifyAndEnable: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await mfaService.verifyAndEnable(req.user!.userId, req.body.token);
    return sendSuccess(res, 200, { message: 'MFA enabled — store these backup codes safely', data });
  }),
  disable: asyncHandler(async (req: AuthRequest, res: Response) => {
    await mfaService.disable(req.user!.userId, req.user!.userId);
    return sendSuccess(res, 200, { message: 'MFA disabled' });
  }),
};
