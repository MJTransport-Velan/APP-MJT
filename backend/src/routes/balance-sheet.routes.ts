import { Router } from 'express';
import { z } from 'zod';
import { balanceSheetController } from '../controllers/balance-sheet.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';

const getQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'asOfDate must be YYYY-MM-DD').optional() }),
});

const router = Router();
router.use(authenticate);

router.get('/', authorize('balance_sheet.view'), validate(getQuerySchema), balanceSheetController.get);

export default router;
