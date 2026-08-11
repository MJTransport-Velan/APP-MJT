import { Router } from 'express';
import { backupController } from '../controllers/backup.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listBackupsSchema, backupIdParamSchema } from '../validators/backup.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('backup.view'), validate(listBackupsSchema), backupController.list);
router.get('/latest-status', authorize('backup.view'), backupController.latestStatus);
router.post('/run', authorize('backup.run'), backupController.runManual);
router.post('/:id/verify', authorize('backup.run'), validate(backupIdParamSchema), backupController.verify);

export default router;
