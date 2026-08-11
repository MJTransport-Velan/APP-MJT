import { SystemSettingCategory } from '@prisma/client';
import { systemSettingRepository } from '../repositories/system-setting.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';

export const systemSettingService = {
  async list(category?: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    return systemSettingRepository.findAll(organizationId, category as SystemSettingCategory | undefined);
  },

  /** Typed convenience getter used internally by other Phase 8 services (backup retention, password policy, etc.) — returns the fallback when unset rather than throwing, since every setting has a sensible default. */
  async get(category: SystemSettingCategory, key: string, fallback: string): Promise<string> {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const row = await systemSettingRepository.findOne(organizationId, category, key);
    return row?.value ?? fallback;
  },

  async set(category: SystemSettingCategory, key: string, value: string, description: string | undefined, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const setting = await systemSettingRepository.upsert(organizationId, category, key, value, description, actorId);

    await auditService.record({
      userId: actorId,
      action: 'CONFIGURATION_CHANGE',
      entityType: 'SystemSetting',
      entityId: setting.id,
      description: `Set ${category}.${key} = ${value}`,
    });

    return setting;
  },
};
