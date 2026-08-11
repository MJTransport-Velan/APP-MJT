import { Router } from 'express';
import { driverLoanController } from '../controllers/driver-loan.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listDriverLoansSchema,
  driverLoanIdParamSchema,
  createDriverLoanSchema,
  rejectDriverLoanSchema,
} from '../validators/driver-loan.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('driverLoan.view'), validate(listDriverLoansSchema), driverLoanController.list);
router.get('/:id', authorize('driverLoan.view'), validate(driverLoanIdParamSchema), driverLoanController.getById);
router.post('/', authorize('driverLoan.create'), validate(createDriverLoanSchema), driverLoanController.request);
router.patch('/:id/approve', authorize('driverLoan.approve'), validate(driverLoanIdParamSchema), driverLoanController.approve);
router.patch('/:id/reject', authorize('driverLoan.approve'), validate(rejectDriverLoanSchema), driverLoanController.reject);
router.delete('/:id', authorize('driverLoan.delete'), validate(driverLoanIdParamSchema), driverLoanController.remove);

export default router;
