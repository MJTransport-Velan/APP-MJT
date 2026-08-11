import { Router } from 'express';
import { performanceController } from '../controllers/performance.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();
router.use(authenticate);

router.get('/me', authorize('performance.view'), performanceController.me);
router.get('/team', authorize('performance.team'), performanceController.team);

export default router;
