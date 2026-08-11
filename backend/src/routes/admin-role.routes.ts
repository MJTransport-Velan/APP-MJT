import { Router } from 'express';
import { adminRoleController } from '../controllers/admin-role.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
  cloneRoleSchema,
  assignPermissionsSchema,
} from '../validators/admin-role.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('role.view'), adminRoleController.list);
router.get('/:id', authorize('role.view'), validate(roleIdParamSchema), adminRoleController.getById);
router.post('/', authorize('role.create'), validate(createRoleSchema), adminRoleController.create);
router.put('/:id', authorize('role.edit'), validate(updateRoleSchema), adminRoleController.update);
router.delete('/:id', authorize('role.delete'), validate(roleIdParamSchema), adminRoleController.remove);
router.post('/:id/clone', authorize('role.clone'), validate(cloneRoleSchema), adminRoleController.clone);
router.put(
  '/:id/permissions',
  authorize('role.assign_permissions'),
  validate(assignPermissionsSchema),
  adminRoleController.assignPermissions
);

export default router;
