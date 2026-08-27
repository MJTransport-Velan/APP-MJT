import { Router } from 'express';
import { bankTransferController } from '../controllers/bank-transfer.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createBankTransferSchema,
  updateBankTransferSchema,
  bankTransferIdParamSchema,
  listBankTransfersSchema,
} from '../validators/bank-transfer.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('bankTransfer.view'), validate(listBankTransfersSchema), bankTransferController.list);
router.get('/:id', authorize('bankTransfer.view'), validate(bankTransferIdParamSchema), bankTransferController.getById);
router.put('/:id', authorize('bankTransfer.edit'), validate(updateBankTransferSchema), bankTransferController.update);
router.delete('/:id', authorize('bankTransfer.delete'), validate(bankTransferIdParamSchema), bankTransferController.remove);
router.post('/', authorize('bankTransfer.create'), validate(createBankTransferSchema), bankTransferController.create);

export default router;
