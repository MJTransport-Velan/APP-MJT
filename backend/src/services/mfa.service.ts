import { generateSecret, generateURI, generate, verify } from 'otplib';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';

const TOTP_OPTS = { algorithm: 'sha1' as const, digits: 6, period: 30, type: 'totp' as const };

function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString('hex').toUpperCase());
}

export const mfaService = {
  /** Generates a new secret and stores it un-enabled until verify() confirms the user actually has it in an authenticator app. */
  async beginSetup(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const secret = await generateSecret();
    const otpauthUrl = generateURI({ issuer: 'MJ Transport ERP', label: user.username, secret, ...TOTP_OPTS });

    await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret, mfaEnabled: false } });
    return { secret, otpauthUrl };
  },

  async verifyAndEnable(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new AppError('MFA setup has not been started for this user', 422);

    const result = await verify({ token, secret: user.mfaSecret, ...TOTP_OPTS });
    if (!result.valid) throw new AppError('Invalid authenticator code', 422);

    const backupCodes = generateBackupCodes();
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaBackupCodesJson: JSON.stringify(backupCodes) },
    });

    await auditService.record({ userId, action: 'MFA_ENABLED', entityType: 'User', entityId: userId, description: 'Multi-factor authentication enabled' });
    return { backupCodes };
  },

  async disable(userId: string, actorId: string) {
    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodesJson: null } });
    await auditService.record({ userId: actorId, action: 'MFA_DISABLED', entityType: 'User', entityId: userId, description: 'Multi-factor authentication disabled' });
  },

  async status(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true } });
    return { mfaEnabled: user?.mfaEnabled ?? false };
  },

  /** Verifies a live TOTP code OR consumes a one-time backup code — used wherever a caller wants to step up an already-authenticated session (this ERP does not yet gate /auth/login itself behind this, per the design brief's "Foundation" scope). */
  async verifyCode(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled || !user.mfaSecret) return false;

    const result = await verify({ token, secret: user.mfaSecret, ...TOTP_OPTS });
    if (result.valid) return true;

    const backupCodes: string[] = user.mfaBackupCodesJson ? JSON.parse(user.mfaBackupCodesJson) : [];
    const idx = backupCodes.indexOf(token.toUpperCase());
    if (idx === -1) return false;

    backupCodes.splice(idx, 1);
    await prisma.user.update({ where: { id: userId }, data: { mfaBackupCodesJson: JSON.stringify(backupCodes) } });
    return true;
  },

  generateTestCode(secret: string) {
    return generate({ secret, ...TOTP_OPTS });
  },
};
