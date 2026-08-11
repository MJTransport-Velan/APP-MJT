import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  generateInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdParamSchema,
  createCreditNoteSchema,
  createDebitNoteSchema,
} from '../validators/invoice.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('invoice.view'), invoiceController.list);
router.get('/:id', authorize('invoice.view'), validate(invoiceIdParamSchema), invoiceController.getById);
router.post('/', authorize('invoice.create'), validate(generateInvoiceSchema), invoiceController.generate);
router.put('/:id', authorize('invoice.edit'), validate(updateInvoiceSchema), invoiceController.update);
router.patch('/:id/send', authorize('invoice.edit'), validate(invoiceIdParamSchema), invoiceController.send);
router.patch('/:id/cancel', authorize('invoice.cancel'), validate(invoiceIdParamSchema), invoiceController.cancel);
router.delete('/:id', authorize('invoice.delete'), validate(invoiceIdParamSchema), invoiceController.remove);
router.post(
  '/:id/credit-notes',
  authorize('creditNote.create'),
  validate(createCreditNoteSchema),
  invoiceController.addCreditNote
);
router.post(
  '/:id/debit-notes',
  authorize('customerDebitNote.create'),
  validate(createDebitNoteSchema),
  invoiceController.addDebitNote
);

export default router;
