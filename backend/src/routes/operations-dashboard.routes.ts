import { Router } from 'express';
import { operationsDashboardController } from '../controllers/operations-dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

router.get('/', authenticate, authorize('operations.view'), operationsDashboardController.summary);

export default router;
