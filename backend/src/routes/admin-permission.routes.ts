import { Router } from 'express';
import { adminPermissionController } from '../controllers/admin-permission.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listPermissionsSchema } from '../validators/admin-permission.validator';

const router = Router();

router.use(authenticate);

router.get('/grouped', authorize('permission.view'), adminPermissionController.grouped);
router.get('/', authorize('permission.view'), validate(listPermissionsSchema), adminPermissionController.list);

export default router;
