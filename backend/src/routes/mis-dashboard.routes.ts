import { Router } from 'express';
import { misDashboardController } from '../controllers/mis-dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('mis_dashboard.view'), misDashboardController.summary);

export default router;
