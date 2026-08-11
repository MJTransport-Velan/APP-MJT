import { Router } from 'express';
import { supplierController } from '../controllers/supplier.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSupplierSchema, updateSupplierSchema, supplierIdParamSchema } from '../validators/supplier.validator';
import { uploadSupplierDocument } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('supplier.view'), supplierController.list);
router.get('/:id', authorize('supplier.view'), validate(supplierIdParamSchema), supplierController.getById);
router.post('/', authorize('supplier.create'), validate(createSupplierSchema), supplierController.create);
router.put('/:id', authorize('supplier.edit'), validate(updateSupplierSchema), supplierController.update);
router.post(
  '/:id/document',
  authorize('supplier.edit'),
  validate(supplierIdParamSchema),
  uploadSupplierDocument,
  supplierController.uploadDocument
);
router.patch('/:id/status', authorize('supplier.edit'), validate(supplierIdParamSchema), supplierController.toggleStatus);
router.delete('/:id', authorize('supplier.delete'), validate(supplierIdParamSchema), supplierController.remove);

export default router;
