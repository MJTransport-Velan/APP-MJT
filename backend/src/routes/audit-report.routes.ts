import { Router } from 'express';
import { auditReportController } from '../controllers/audit-report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { userActivityQuerySchema } from '../validators/audit-report.validator';

const router = Router();
router.use(authenticate);

router.get('/user-activity', authorize('audit_report.view'), validate(userActivityQuerySchema), auditReportController.userActivity);

export default router;
