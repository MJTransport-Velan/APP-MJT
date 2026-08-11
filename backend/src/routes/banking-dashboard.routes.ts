import { Router } from 'express';
import { z } from 'zod';
import { bankingDashboardController } from '../controllers/banking-dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();
router.use(authenticate);

const summarySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ organizationId: z.string().uuid().optional() }),
});

router.get('/', authorize('bankDashboard.view'), validate(summarySchema), bankingDashboardController.summary);

export default router;
