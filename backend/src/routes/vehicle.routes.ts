import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createVehicleSchema, updateVehicleSchema, vehicleIdParamSchema } from '../validators/vehicle.validator';
import { uploadVehicleDocuments } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('vehicle.view'), vehicleController.list);
router.get('/:id', authorize('vehicle.view'), validate(vehicleIdParamSchema), vehicleController.getById);
router.post('/', authorize('vehicle.create'), validate(createVehicleSchema), vehicleController.create);
router.put('/:id', authorize('vehicle.edit'), validate(updateVehicleSchema), vehicleController.update);
router.post(
  '/:id/documents',
  authorize('vehicle.edit'),
  validate(vehicleIdParamSchema),
  uploadVehicleDocuments,
  vehicleController.uploadDocuments
);
router.patch('/:id/status', authorize('vehicle.edit'), validate(vehicleIdParamSchema), vehicleController.toggleStatus);
router.delete('/:id', authorize('vehicle.delete'), validate(vehicleIdParamSchema), vehicleController.remove);

export default router;
