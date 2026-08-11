import { Router } from 'express';
import { systemDashboardController } from '../controllers/system-dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();
router.use(authenticate);
router.use(authorize('system_dashboard.view'));

router.get('/health', systemDashboardController.health);
router.get('/metrics', systemDashboardController.metrics);
router.get('/readiness', systemDashboardController.readiness);

export default router;
