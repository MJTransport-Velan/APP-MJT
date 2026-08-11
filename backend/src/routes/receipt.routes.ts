import { Router } from 'express';
import { receiptController } from '../controllers/receipt.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createReceiptSchema,
  updateReceiptSchema,
  receiptIdParamSchema,
  allocateReceiptSchema,
} from '../validators/receipt.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('receipt.view'), receiptController.list);
router.get('/:id', authorize('receipt.view'), validate(receiptIdParamSchema), receiptController.getById);
router.post('/', authorize('receipt.create'), validate(createReceiptSchema), receiptController.create);
router.put('/:id', authorize('receipt.edit'), validate(updateReceiptSchema), receiptController.update);
router.patch(
  '/:id/allocate',
  authorize('receipt.allocate'),
  validate(allocateReceiptSchema),
  receiptController.allocate
);
router.delete('/:id', authorize('receipt.edit'), validate(receiptIdParamSchema), receiptController.remove);

export default router;
