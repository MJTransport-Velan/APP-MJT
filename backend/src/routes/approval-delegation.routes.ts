import { Router } from 'express';
import { approvalDelegationController } from '../controllers/approval-delegation.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createApprovalDelegationSchema, approvalDelegationIdParamSchema } from '../validators/approval-delegation.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('approval_delegation.view'), approvalDelegationController.list);
router.post('/', authorize('approval_delegation.create'), validate(createApprovalDelegationSchema), approvalDelegationController.create);
router.patch('/:id/revoke', authorize('approval_delegation.create'), validate(approvalDelegationIdParamSchema), approvalDelegationController.revoke);

export default router;
