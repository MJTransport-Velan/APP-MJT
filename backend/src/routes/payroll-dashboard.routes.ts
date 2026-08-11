import { Router } from 'express';
import { payrollDashboardController } from '../controllers/payroll-dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('payrollDashboard.view'), payrollDashboardController.getSummary);

export default router;
