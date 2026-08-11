import { Router } from 'express';
import { systemExceptionController } from '../controllers/system-exception.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listSystemExceptionsSchema, systemExceptionIdParamSchema, resolveSystemExceptionSchema } from '../validators/system-exception.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('system_exception.view'), validate(listSystemExceptionsSchema), systemExceptionController.list);
router.patch('/:id/acknowledge', authorize('system_exception.manage'), validate(systemExceptionIdParamSchema), systemExceptionController.acknowledge);
router.patch('/:id/resolve', authorize('system_exception.manage'), validate(resolveSystemExceptionSchema), systemExceptionController.resolve);

export default router;
