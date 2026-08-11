import { Router } from 'express';
import { fleetDashboardController } from '../controllers/fleet-dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

router.get('/', authenticate, authorize('fleet.view'), fleetDashboardController.summary);

export default router;
