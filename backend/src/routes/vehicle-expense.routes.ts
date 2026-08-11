import { Router } from 'express';
import { vehicleExpenseController } from '../controllers/vehicle-expense.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createExpenseSchema, updateExpenseSchema, expenseIdParamSchema, approveExpenseSchema, rejectExpenseSchema } from '../validators/vehicle-expense.validator';
import { uploadExpenseBill } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('vehicle_expense.view'), vehicleExpenseController.list);
router.get('/:id', authorize('vehicle_expense.view'), validate(expenseIdParamSchema), vehicleExpenseController.getById);
router.post('/', authorize('vehicle_expense.create'), validate(createExpenseSchema), vehicleExpenseController.create);
router.put('/:id', authorize('vehicle_expense.edit'), validate(updateExpenseSchema), vehicleExpenseController.update);
router.patch('/:id/approve', authorize('vehicle_expense.approve'), validate(approveExpenseSchema), vehicleExpenseController.approve);
router.patch('/:id/reject', authorize('vehicle_expense.approve'), validate(rejectExpenseSchema), vehicleExpenseController.reject);
router.post(
  '/:id/bill',
  authorize('vehicle_expense.edit'),
  validate(expenseIdParamSchema),
  uploadExpenseBill,
  vehicleExpenseController.uploadBill
);
router.delete(
  '/:id',
  authorize('vehicle_expense.delete'),
  validate(expenseIdParamSchema),
  vehicleExpenseController.remove
);

export default router;
