import { Router } from 'express';
import { supplierPaymentController } from '../controllers/supplier-payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createSupplierPaymentSchema,
  updateSupplierPaymentSchema,
  supplierPaymentIdParamSchema,
  allocateSupplierPaymentSchema,
} from '../validators/supplier-payment.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('supplierPayment.view'), supplierPaymentController.list);
router.get(
  '/:id',
  authorize('supplierPayment.view'),
  validate(supplierPaymentIdParamSchema),
  supplierPaymentController.getById
);
router.post(
  '/',
  authorize('supplierPayment.create'),
  validate(createSupplierPaymentSchema),
  supplierPaymentController.create
);
router.put(
  '/:id',
  authorize('supplierPayment.edit'),
  validate(updateSupplierPaymentSchema),
  supplierPaymentController.update
);
router.patch(
  '/:id/allocate',
  authorize('supplierPayment.allocate'),
  validate(allocateSupplierPaymentSchema),
  supplierPaymentController.allocate
);
router.delete(
  '/:id',
  authorize('supplierPayment.edit'),
  validate(supplierPaymentIdParamSchema),
  supplierPaymentController.remove
);

export default router;
