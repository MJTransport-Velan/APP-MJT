import { Router } from 'express';
import { loanController } from '../controllers/loan.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listLoansSchema,
  loanIdParamSchema,
  createLoanSchema,
  updateLoanSchema,
  payEmiSchema,
  installmentIdParamSchema,
  loanDashboardSchema,
} from '../validators/loan.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('loan.view'), validate(listLoansSchema), loanController.list);
router.get('/dashboard', authorize('loan.view'), validate(loanDashboardSchema), loanController.dashboard);
router.get('/:id', authorize('loan.view'), validate(loanIdParamSchema), loanController.getById);
router.post('/', authorize('loan.create'), validate(createLoanSchema), loanController.create);
router.put('/:id', authorize('loan.edit'), validate(updateLoanSchema), loanController.update);
router.delete('/:id', authorize('loan.delete'), validate(loanIdParamSchema), loanController.remove);
router.patch('/:id/installments/:installmentId/pay', authorize('loan_emi.pay'), validate(payEmiSchema), loanController.payEmi);
router.patch('/:id/installments/:installmentId/reverse', authorize('loan_emi.reverse'), validate(installmentIdParamSchema), loanController.reverseEmi);

export default router;
