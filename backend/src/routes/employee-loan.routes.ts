import { Router } from 'express';
import { employeeLoanController } from '../controllers/employee-loan.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listEmployeeLoansSchema,
  employeeLoanIdParamSchema,
  createEmployeeLoanSchema,
  rejectEmployeeLoanSchema,
} from '../validators/employee-loan.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('employeeLoan.view'), validate(listEmployeeLoansSchema), employeeLoanController.list);
router.get('/:id', authorize('employeeLoan.view'), validate(employeeLoanIdParamSchema), employeeLoanController.getById);
router.post('/', authorize('employeeLoan.create'), validate(createEmployeeLoanSchema), employeeLoanController.request);
router.patch('/:id/approve', authorize('employeeLoan.approve'), validate(employeeLoanIdParamSchema), employeeLoanController.approve);
router.patch('/:id/reject', authorize('employeeLoan.approve'), validate(rejectEmployeeLoanSchema), employeeLoanController.reject);
router.delete('/:id', authorize('employeeLoan.delete'), validate(employeeLoanIdParamSchema), employeeLoanController.remove);

export default router;
