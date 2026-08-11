import { Router } from 'express';
import { vehicleTyreController } from '../controllers/vehicle-tyre.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listVehicleTyresSchema,
  vehicleTyreIdParamSchema,
  installTyreSchema,
  rotateTyreSchema,
  removeTyreSchema,
} from '../validators/vehicle-tyre.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('vehicle_tyre.view'), validate(listVehicleTyresSchema), vehicleTyreController.list);
router.get('/:id', authorize('vehicle_tyre.view'), validate(vehicleTyreIdParamSchema), vehicleTyreController.getById);
router.post('/', authorize('vehicle_tyre.create'), validate(installTyreSchema), vehicleTyreController.install);
router.patch('/:id/rotate', authorize('vehicle_tyre.edit'), validate(rotateTyreSchema), vehicleTyreController.rotate);
router.patch('/:id/remove', authorize('vehicle_tyre.edit'), validate(removeTyreSchema), vehicleTyreController.remove);
router.patch('/:id/scrap', authorize('vehicle_tyre.edit'), validate(vehicleTyreIdParamSchema), vehicleTyreController.scrap);

export default router;
