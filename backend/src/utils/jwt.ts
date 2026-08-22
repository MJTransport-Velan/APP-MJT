import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
  /**
   * Snapshot of User.tokenVersion at sign time. auth.middleware.ts rejects
   * the token when it no longer matches the stored value, which is how
   * logout / deactivate / delete / role change take effect immediately
   * rather than at the token's natural expiry.
   */
  tokenVersion: number;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as SignOptions);
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.jwt.refreshSecret) as { userId: string };
}
