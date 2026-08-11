import { Router } from 'express';
import { loanReportController } from '../controllers/loan-report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const summaryQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ status: z.string().optional() }),
});

const router = Router();
router.use(authenticate);

router.get('/summary', authorize('loan_report.view'), validate(summaryQuerySchema), loanReportController.summary);

export default router;
