import { Router } from 'express';
import { supplierVehicleController } from '../controllers/supplier-vehicle.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('supplier_vehicle.view'), supplierVehicleController.list);
router.get(
  '/suppliers/:supplierId/history',
  authorize('supplier_vehicle.view'),
  supplierVehicleController.assignmentHistory
);

export default router;
