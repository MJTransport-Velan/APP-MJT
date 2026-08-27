import { Router } from 'express';
import { cashAccountController } from '../controllers/cash-account.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createCashAccountSchema,
  updateCashAccountSchema,
  cashAccountIdParamSchema,
  listCashAccountsSchema,
} from '../validators/cash-account.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('cashAccount.view'), validate(listCashAccountsSchema), cashAccountController.list);
router.get('/:id', authorize('cashAccount.view'), validate(cashAccountIdParamSchema), cashAccountController.getById);
router.post('/', authorize('cashAccount.create'), validate(createCashAccountSchema), cashAccountController.create);
router.put('/:id', authorize('cashAccount.edit'), validate(updateCashAccountSchema), cashAccountController.update);
router.patch('/:id/status', authorize('cashAccount.edit'), validate(cashAccountIdParamSchema), cashAccountController.toggleStatus);
router.delete('/:id', authorize('cashAccount.delete'), validate(cashAccountIdParamSchema), cashAccountController.remove);

export default router;
