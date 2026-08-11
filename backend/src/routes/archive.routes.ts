import { Router } from 'express';
import { archiveController } from '../controllers/archive.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listArchiveRunsSchema, runArchiveSchema } from '../validators/archive.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('archive.view'), validate(listArchiveRunsSchema), archiveController.list);
router.post('/run', authorize('archive.run'), validate(runArchiveSchema), archiveController.run);

export default router;
