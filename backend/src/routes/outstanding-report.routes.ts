import { Router } from 'express';
import { outstandingReportController } from '../controllers/outstanding-report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();
router.use(authenticate);

router.get('/driver', authorize('outstanding_report.view'), outstandingReportController.driver);
router.get('/employee', authorize('outstanding_report.view'), outstandingReportController.employee);

export default router;
