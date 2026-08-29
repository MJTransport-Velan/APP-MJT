import { Router } from 'express';
import { loanGivenController } from '../controllers/loan-given.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listLoansGivenSchema,
  loanGivenIdParamSchema,
  createLoanGivenSchema,
  updateLoanGivenSchema,
  recordRepaymentSchema,
  repaymentIdParamSchema,
  writeOffLoanGivenSchema,
} from '../validators/loan-given.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('loan_given.view'), validate(listLoansGivenSchema), loanGivenController.list);
router.get('/summary', authorize('loan_given.view'), loanGivenController.summary);
router.get('/:id', authorize('loan_given.view'), validate(loanGivenIdParamSchema), loanGivenController.getById);

router.post('/', authorize('loan_given.create'), validate(createLoanGivenSchema), loanGivenController.create);
router.put('/:id', authorize('loan_given.edit'), validate(updateLoanGivenSchema), loanGivenController.update);

// Recording money coming back, and taking a mistaken one off again.
router.post('/:id/repayments', authorize('loan_given.edit'), validate(recordRepaymentSchema), loanGivenController.recordRepayment);
router.delete('/:id/repayments/:repaymentId', authorize('loan_given.edit'), validate(repaymentIdParamSchema), loanGivenController.removeRepayment);

// Writing off drops the outstanding amount off the Balance Sheet, and
// reopening puts it back — the same decision taken back, so same permission.
router.patch('/:id/write-off', authorize('loan_given.edit'), validate(writeOffLoanGivenSchema), loanGivenController.writeOff);
router.patch('/:id/reopen', authorize('loan_given.edit'), validate(loanGivenIdParamSchema), loanGivenController.reopen);

router.delete('/:id', authorize('loan_given.delete'), validate(loanGivenIdParamSchema), loanGivenController.remove);

export default router;
