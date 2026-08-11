import { Router } from 'express';
import { tripExpenseController } from '../controllers/trip-expense.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createTripExpenseSchema,
  updateTripExpenseSchema,
  tripExpenseIdParamSchema,
} from '../validators/trip-expense.validator';
import { uploadExpenseBill } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('trip_expense.view'), tripExpenseController.list);
router.get('/:id', authorize('trip_expense.view'), validate(tripExpenseIdParamSchema), tripExpenseController.getById);
router.post('/', authorize('trip_expense.create'), validate(createTripExpenseSchema), tripExpenseController.create);
router.put('/:id', authorize('trip_expense.edit'), validate(updateTripExpenseSchema), tripExpenseController.update);
router.post(
  '/:id/bill',
  authorize('trip_expense.edit'),
  validate(tripExpenseIdParamSchema),
  uploadExpenseBill,
  tripExpenseController.uploadBill
);
router.delete(
  '/:id',
  authorize('trip_expense.delete'),
  validate(tripExpenseIdParamSchema),
  tripExpenseController.remove
);

export default router;
