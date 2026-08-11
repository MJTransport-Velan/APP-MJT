import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdParamSchema,
  listOrganizationsSchema,
} from '../validators/organization.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('organization.view'), validate(listOrganizationsSchema), organizationController.list);
router.get('/:id', authorize('organization.view'), validate(organizationIdParamSchema), organizationController.getById);
router.post('/', authorize('organization.create'), validate(createOrganizationSchema), organizationController.create);
router.put('/:id', authorize('organization.edit'), validate(updateOrganizationSchema), organizationController.update);
router.patch(
  '/:id/status',
  authorize('organization.edit'),
  validate(organizationIdParamSchema),
  organizationController.toggleStatus
);

export default router;
