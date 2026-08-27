import { Router } from 'express';
import { capitalTransactionController } from '../controllers/capital-transaction.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listCapitalTransactionsSchema,
  capitalTransactionIdParamSchema,
  partnerIdParamSchema,
  createCapitalTransactionSchema,
  updateCapitalTransactionSchema,
} from '../validators/capital-transaction.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('capital_transaction.view'), validate(listCapitalTransactionsSchema), capitalTransactionController.list);
router.get('/partner/:partnerId', authorize('capital_transaction.view'), validate(partnerIdParamSchema), capitalTransactionController.partnerState);
router.get('/:id', authorize('capital_transaction.view'), validate(capitalTransactionIdParamSchema), capitalTransactionController.getById);
router.post('/', authorize('capital_transaction.create'), validate(createCapitalTransactionSchema), capitalTransactionController.create);
router.put('/:id', authorize('capital_transaction.edit'), validate(updateCapitalTransactionSchema), capitalTransactionController.update);
router.delete('/:id', authorize('capital_transaction.delete'), validate(capitalTransactionIdParamSchema), capitalTransactionController.remove);

export default router;
