import { approvalDelegationRepository } from '../repositories/approval-delegation.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { CreateApprovalDelegationInput } from '../validators/approval-delegation.validator';

export const approvalDelegationService = {
  async list() {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    return approvalDelegationRepository.findAll(organizationId);
  },

  async create(input: CreateApprovalDelegationInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    if (new Date(input.fromDate) > new Date(input.toDate)) {
      throw new AppError('fromDate cannot be after toDate', 422);
    }
    const delegation = await approvalDelegationRepository.create({
      organizationId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      fromDate: new Date(input.fromDate),
      toDate: new Date(input.toDate),
      reason: input.reason,
      createdById: actorId,
    });
    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'ApprovalDelegation', entityId: delegation.id, description: `Delegated approvals from ${input.fromUserId} to ${input.toUserId}` });
    return delegation;
  },

  async revoke(id: string, actorId: string) {
    const existing = await approvalDelegationRepository.findById(id);
    if (!existing) throw new AppError('Delegation not found', 404);
    const updated = await approvalDelegationRepository.deactivate(id);
    await auditService.record({ userId: actorId, action: 'REVOKE', entityType: 'ApprovalDelegation', entityId: id, description: 'Revoked approval delegation' });
    return updated;
  },
};
