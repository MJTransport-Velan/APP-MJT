import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { prisma } from '../config/db';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Verifying the signature alone is not enough: a JWT is a snapshot taken at
 * login, so on its own it keeps working for its full lifetime no matter what
 * happens to the account behind it. Every request therefore also re-checks
 * the user against the database — a deleted, deactivated, or logged-out
 * account, or one whose roles changed, must lose access at once rather than
 * when the token happens to expire.
 *
 * This costs one indexed primary-key lookup per request, selecting only the
 * four columns needed rather than the full user graph.
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return sendError(res, 401, 'Authentication token missing');
  }

  const token = header.split(' ')[1];

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return sendError(res, 401, 'Invalid or expired token');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true, deletedAt: true, tokenVersion: true },
    });

    if (!user || user.deletedAt !== null || !user.isActive) {
      return sendError(res, 401, 'This account is no longer active. Please sign in again.');
    }

    // Tokens issued before the last logout/role change carry a stale version.
    // Treat a payload with no version at all as stale too, so tokens minted
    // before this check existed cannot outlive the deployment.
    if (typeof payload.tokenVersion !== 'number' || payload.tokenVersion !== user.tokenVersion) {
      return sendError(res, 401, 'This session has ended. Please sign in again.');
    }

    req.user = payload;
    return next();
  } catch (err) {
    return next(err);
  }
}
