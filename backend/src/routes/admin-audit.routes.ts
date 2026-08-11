import { Router } from 'express';
import { adminAuditController } from '../controllers/admin-audit.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listAuditLogsSchema } from '../validators/admin-audit.validator';

const router = Router();

router.use(authenticate);
router.get('/', authorize('audit.view'), validate(listAuditLogsSchema), adminAuditController.list);

export default router;
