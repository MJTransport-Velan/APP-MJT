import { Router } from 'express';
import { adminGroupController } from '../controllers/admin-group.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createGroupSchema,
  updateGroupSchema,
  groupIdParamSchema,
  assignGroupMembersSchema,
  removeGroupMemberSchema,
  assignGroupCompaniesSchema,
} from '../validators/admin-group.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('group.view'), adminGroupController.list);
router.get('/:id', authorize('group.view'), validate(groupIdParamSchema), adminGroupController.getById);
router.post('/', authorize('group.create'), validate(createGroupSchema), adminGroupController.create);
router.put('/:id', authorize('group.edit'), validate(updateGroupSchema), adminGroupController.update);
router.delete('/:id', authorize('group.delete'), validate(groupIdParamSchema), adminGroupController.remove);
router.put(
  '/:id/members',
  authorize('group.assign'),
  validate(assignGroupMembersSchema),
  adminGroupController.setMembers
);
router.delete(
  '/:id/members/:userId',
  authorize('group.assign'),
  validate(removeGroupMemberSchema),
  adminGroupController.removeMember
);
router.put(
  '/:id/companies',
  authorize('group.assign'),
  validate(assignGroupCompaniesSchema),
  adminGroupController.setCompanies
);

export default router;
