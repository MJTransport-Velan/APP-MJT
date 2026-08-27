import { Router } from 'express';
import { chequeController } from '../controllers/cheque.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  issueChequeSchema,
  updateChequeSchema,
  receiveChequeSchema,
  depositChequeSchema,
  clearChequeSchema,
  bounceChequeSchema,
  cancelChequeSchema,
  chequeIdParamSchema,
  listChequesSchema,
} from '../validators/cheque.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('cheque.view'), validate(listChequesSchema), chequeController.list);
router.get('/:id', authorize('cheque.view'), validate(chequeIdParamSchema), chequeController.getById);
router.put('/:id', authorize('cheque.edit'), validate(updateChequeSchema), chequeController.update);
router.delete('/:id', authorize('cheque.delete'), validate(chequeIdParamSchema), chequeController.remove);
router.post('/issue', authorize('cheque.create'), validate(issueChequeSchema), chequeController.issue);
router.post('/receive', authorize('cheque.create'), validate(receiveChequeSchema), chequeController.receive);
router.post('/:id/deposit', authorize('cheque.edit'), validate(depositChequeSchema), chequeController.deposit);
router.post('/:id/present', authorize('cheque.edit'), validate(chequeIdParamSchema), chequeController.markPresented);
router.post('/:id/clear', authorize('cheque.clear'), validate(clearChequeSchema), chequeController.clear);
router.post('/:id/bounce', authorize('cheque.bounce'), validate(bounceChequeSchema), chequeController.bounce);
router.post('/:id/cancel', authorize('cheque.cancel'), validate(cancelChequeSchema), chequeController.cancel);
router.post('/:id/stop-payment', authorize('cheque.cancel'), validate(cancelChequeSchema), chequeController.stopPayment);

export default router;
