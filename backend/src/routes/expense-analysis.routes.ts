import { Router } from 'express';
import { z } from 'zod';
import { expenseAnalysisController } from '../controllers/expense-analysis.controller';
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

router.get('/', authorize('expense_analysis.view'), validate(rangeReportQuerySchema), expenseAnalysisController.analyze);

export default router;
