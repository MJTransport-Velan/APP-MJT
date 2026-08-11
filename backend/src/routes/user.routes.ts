import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('users.view'), userController.list);
router.post('/', authorize('users.create'), validate(createUserSchema), userController.create);
router.put('/:id', authorize('users.update'), validate(updateUserSchema), userController.update);
router.delete('/:id', authorize('users.delete'), userController.remove);

export default router;
