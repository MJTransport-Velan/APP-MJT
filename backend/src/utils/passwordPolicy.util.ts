import { AppError } from '../middlewares/error.middleware';
import { systemSettingService } from '../services/system-setting.service';

/**
 * Reads its thresholds from SystemSetting (category SECURITY), falling
 * back to sane defaults when unset — so the very first user this ERP ever
 * creates isn't blocked by a policy nobody configured yet.
 */
export async function enforcePasswordPolicy(password: string): Promise<void> {
  const [minLength, requireUppercase, requireNumber, requireSymbol] = await Promise.all([
    systemSettingService.get('SECURITY', 'passwordMinLength', '8'),
    systemSettingService.get('SECURITY', 'passwordRequireUppercase', 'true'),
    systemSettingService.get('SECURITY', 'passwordRequireNumber', 'true'),
    systemSettingService.get('SECURITY', 'passwordRequireSymbol', 'false'),
  ]);

  const problems: string[] = [];
  if (password.length < Number(minLength)) problems.push(`at least ${minLength} characters`);
  if (requireUppercase === 'true' && !/[A-Z]/.test(password)) problems.push('an uppercase letter');
  if (requireNumber === 'true' && !/[0-9]/.test(password)) problems.push('a number');
  if (requireSymbol === 'true' && !/[^A-Za-z0-9]/.test(password)) problems.push('a symbol');

  if (problems.length > 0) {
    throw new AppError(`Password must contain ${problems.join(', ')}`, 422);
  }
}
