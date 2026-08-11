import { Router } from 'express';
import { payrollRunController } from '../controllers/payroll-run.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listPayrollRunsSchema,
  payrollRunIdParamSchema,
  createPayrollRunSchema,
  calculatePayrollRunSchema,
} from '../validators/payroll-run.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('payrollRun.view'), validate(listPayrollRunsSchema), payrollRunController.list);
router.get('/:id', authorize('payrollRun.view'), validate(payrollRunIdParamSchema), payrollRunController.getById);
router.post('/', authorize('payrollRun.create'), validate(createPayrollRunSchema), payrollRunController.create);
router.patch('/:id/calculate', authorize('payrollRun.create'), validate(calculatePayrollRunSchema), payrollRunController.calculate);
router.patch('/:id/verify', authorize('payrollRun.verify'), validate(payrollRunIdParamSchema), payrollRunController.verify);
router.patch('/:id/approve', authorize('payrollRun.approve'), validate(payrollRunIdParamSchema), payrollRunController.approve);
router.patch('/:id/process', authorize('payrollRun.process'), validate(payrollRunIdParamSchema), payrollRunController.process);
router.patch('/:id/pay', authorize('payrollRun.pay'), validate(payrollRunIdParamSchema), payrollRunController.pay);
router.patch('/:id/cancel', authorize('payrollRun.create'), validate(payrollRunIdParamSchema), payrollRunController.cancel);
router.patch('/:id/revert', authorize('payrollRun.create'), validate(payrollRunIdParamSchema), payrollRunController.revertToDraft);

export default router;
