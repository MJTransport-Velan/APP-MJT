import { Router } from 'express';
import { supplierBillController } from '../controllers/supplier-bill.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  generateSupplierBillSchema,
  updateSupplierBillSchema,
  createSupplierCreditNoteSchema,
  createSupplierDebitNoteSchema,
  supplierBillIdParamSchema,
  listSupplierBillsSchema,
} from '../validators/supplier-bill.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('supplierBill.view'), validate(listSupplierBillsSchema), supplierBillController.list);
router.get('/:id', authorize('supplierBill.view'), validate(supplierBillIdParamSchema), supplierBillController.getById);
router.post('/', authorize('supplierBill.create'), validate(generateSupplierBillSchema), supplierBillController.generate);
router.put('/:id', authorize('supplierBill.edit'), validate(updateSupplierBillSchema), supplierBillController.update);
router.patch('/:id/cancel', authorize('supplierBill.edit'), validate(supplierBillIdParamSchema), supplierBillController.cancel);
router.post('/:id/credit-notes', authorize('supplierCreditNote.create'), validate(createSupplierCreditNoteSchema), supplierBillController.addCreditNote);
router.post('/:id/debit-notes', authorize('supplierDebitNote.create'), validate(createSupplierDebitNoteSchema), supplierBillController.addDebitNote);

export default router;
