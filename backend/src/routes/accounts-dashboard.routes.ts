import { Router } from 'express';
import { accountsDashboardController } from '../controllers/accounts-dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

router.get('/', authenticate, authorize('accounts.dashboard'), accountsDashboardController.summary);
router.get('/trends', authenticate, authorize('accounts.dashboard'), accountsDashboardController.trends);

export default router;
