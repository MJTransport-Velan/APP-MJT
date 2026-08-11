import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response';

export function authorize(...requiredPermissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return sendError(res, 401, 'Not authenticated');
    }

    if (user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const hasPermission = requiredPermissions.every((perm) => user.permissions.includes(perm));

    if (!hasPermission) {
      return sendError(res, 403, 'You do not have permission to perform this action');
    }

    return next();
  };
}
