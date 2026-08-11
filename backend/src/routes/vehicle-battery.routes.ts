import { Router } from 'express';
import { vehicleBatteryController } from '../controllers/vehicle-battery.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listVehicleBatteriesSchema, vehicleBatteryIdParamSchema, installBatterySchema } from '../validators/vehicle-battery.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('vehicle_battery.view'), validate(listVehicleBatteriesSchema), vehicleBatteryController.list);
router.get('/:id', authorize('vehicle_battery.view'), validate(vehicleBatteryIdParamSchema), vehicleBatteryController.getById);
router.post('/', authorize('vehicle_battery.create'), validate(installBatterySchema), vehicleBatteryController.install);
router.patch('/:id/dispose', authorize('vehicle_battery.edit'), validate(vehicleBatteryIdParamSchema), vehicleBatteryController.dispose);

export default router;
