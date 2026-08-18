import { Router } from 'express';
import { z } from 'zod';
import { profitLossController } from '../controllers/profit-loss.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';

const getQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD').optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD').optional(),
  }),
});

const router = Router();
router.use(authenticate);

router.get('/', authorize('profit_loss.view'), validate(getQuerySchema), profitLossController.get);

export default router;
