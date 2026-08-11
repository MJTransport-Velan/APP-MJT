import { Router } from 'express';
import { z } from 'zod';
import { driverStatementController } from '../controllers/driver-statement.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';

const statementSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({ from: z.string().optional(), to: z.string().optional() }),
  params: z.object({ driverId: z.string().uuid('Invalid driver id') }),
});

const router = Router();
router.use(authenticate);

router.get('/:driverId/statement', authorize('driverStatement.view'), validate(statementSchema), driverStatementController.getStatement);

export default router;
