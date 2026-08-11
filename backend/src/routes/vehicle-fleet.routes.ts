import { Router } from 'express';
import { vehicleFleetController } from '../controllers/vehicle-fleet.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  vehicleIdParamSchema,
  updateVehicleStatusSchema,
  updateComplianceSchema,
} from '../validators/vehicle-fleet.validator';
import { uploadProfilePhoto, uploadFitnessCertificate, uploadPucCertificate } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/tracking', authorize('vehicle.view'), vehicleFleetController.tracking);
router.get('/:id', authorize('vehicle.view'), validate(vehicleIdParamSchema), vehicleFleetController.getById);
router.get(
  '/:id/availability',
  authorize('vehicle.view'),
  validate(vehicleIdParamSchema),
  vehicleFleetController.availability
);
router.get('/:id/timeline', authorize('vehicle.view'), validate(vehicleIdParamSchema), vehicleFleetController.timeline);
router.patch(
  '/:id/status',
  authorize('vehicle.edit'),
  validate(updateVehicleStatusSchema),
  vehicleFleetController.setStatus
);
router.put(
  '/:id/compliance',
  authorize('vehicle.edit'),
  validate(updateComplianceSchema),
  vehicleFleetController.updateCompliance
);
router.post(
  '/:id/photo',
  authorize('vehicle.edit'),
  validate(vehicleIdParamSchema),
  uploadProfilePhoto,
  vehicleFleetController.uploadPhoto
);
router.post(
  '/:id/fitness',
  authorize('vehicle.edit'),
  validate(vehicleIdParamSchema),
  uploadFitnessCertificate,
  vehicleFleetController.uploadFitness
);
router.post(
  '/:id/puc',
  authorize('vehicle.edit'),
  validate(vehicleIdParamSchema),
  uploadPucCertificate,
  vehicleFleetController.uploadPuc
);

export default router;
