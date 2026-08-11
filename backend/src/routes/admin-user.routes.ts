import { Router } from 'express';
import { adminUserController } from '../controllers/admin-user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  userIdParamSchema,
  resetPasswordSchema,
} from '../validators/admin-user.validator';
import { uploadProfilePhoto } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize('user.view'), adminUserController.list);
router.get('/:id', authorize('user.view'), validate(userIdParamSchema), adminUserController.getById);
router.post('/', authorize('user.create'), validate(createAdminUserSchema), adminUserController.create);
router.put('/:id', authorize('user.edit'), validate(updateAdminUserSchema), adminUserController.update);
router.patch('/:id/activate', authorize('user.edit'), validate(userIdParamSchema), adminUserController.activate);
router.patch('/:id/deactivate', authorize('user.delete'), validate(userIdParamSchema), adminUserController.deactivate);
router.post(
  '/:id/reset-password',
  authorize('user.reset_password'),
  validate(resetPasswordSchema),
  adminUserController.resetPassword
);
router.post(
  '/:id/photo',
  authorize('user.edit'),
  validate(userIdParamSchema),
  uploadProfilePhoto,
  adminUserController.uploadPhoto
);

export default router;
