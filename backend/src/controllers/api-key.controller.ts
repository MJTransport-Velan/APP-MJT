import { Response } from 'express';
import { apiKeyService } from '../services/api-key.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiKeyRequest } from '../middlewares/apiKeyAuth.middleware';

export const apiKeyController = {
  list: asyncHandler(async (_req, res: Response) => {
    const data = await apiKeyService.list();
    return sendSuccess(res, 200, { message: 'API keys fetched', data });
  }),
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await apiKeyService.create(req.body, req.user!.userId);
    return sendSuccess(res, 201, { message: 'API key created — copy it now, it will not be shown again', data });
  }),
  revoke: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await apiKeyService.revoke(req.params.id, req.user!.userId);
    return sendSuccess(res, 200, { message: 'API key revoked', data });
  }),
  whoami: asyncHandler(async (req: ApiKeyRequest, res: Response) => {
    return sendSuccess(res, 200, { message: 'API key authenticated', data: { apiKeyId: req.apiKeyId, scopes: req.apiKeyScopes } });
  }),
};
