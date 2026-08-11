import { Router } from 'express';
import { bankAccountController } from '../controllers/bank-account.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  bankAccountIdParamSchema,
  listBankAccountsSchema,
} from '../validators/bank-account.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('bankAccount.view'), validate(listBankAccountsSchema), bankAccountController.list);
router.get('/:id', authorize('bankAccount.view'), validate(bankAccountIdParamSchema), bankAccountController.getById);
router.post('/', authorize('bankAccount.create'), validate(createBankAccountSchema), bankAccountController.create);
router.put('/:id', authorize('bankAccount.edit'), validate(updateBankAccountSchema), bankAccountController.update);
router.patch('/:id/status', authorize('bankAccount.edit'), validate(bankAccountIdParamSchema), bankAccountController.toggleStatus);

export default router;
