import { Router } from 'express';
import { z } from 'zod';
import { profitabilityReportController } from '../controllers/profitability-report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';

const rangeReportQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ from: z.string().optional(), to: z.string().optional() }),
});

const router = Router();
router.use(authenticate);

router.get('/customer', authorize('profitability_report.view'), validate(rangeReportQuerySchema), profitabilityReportController.customer);
router.get('/supplier', authorize('profitability_report.view'), validate(rangeReportQuerySchema), profitabilityReportController.supplier);
router.get('/vehicle', authorize('profitability_report.view'), validate(rangeReportQuerySchema), profitabilityReportController.vehicle);
router.get('/driver', authorize('profitability_report.view'), validate(rangeReportQuerySchema), profitabilityReportController.driver);

export default router;
