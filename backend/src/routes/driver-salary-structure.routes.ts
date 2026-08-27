import { Router } from 'express';
import { driverSalaryStructureController } from '../controllers/driver-salary-structure.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  driverIdParamSchema,
  driverSalaryStructureIdParamSchema,
  createDriverSalaryStructureSchema,
  updateDriverSalaryStructureSchema,
} from '../validators/driver-salary-structure.validator';

const router = Router();
router.use(authenticate);

router.get(
  '/driver/:driverId',
  authorize('driverSalaryStructure.view'),
  validate(driverIdParamSchema),
  driverSalaryStructureController.listForDriver
);
router.get(
  '/driver/:driverId/active',
  authorize('driverSalaryStructure.view'),
  validate(driverIdParamSchema),
  driverSalaryStructureController.getActiveForDriver
);
router.post(
  '/',
  authorize('driverSalaryStructure.create'),
  validate(createDriverSalaryStructureSchema),
  driverSalaryStructureController.create
);
router.put(
  '/:id',
  authorize('driverSalaryStructure.edit'),
  validate(updateDriverSalaryStructureSchema),
  driverSalaryStructureController.update
);
router.delete(
  '/:id',
  authorize('driverSalaryStructure.delete'),
  validate(driverSalaryStructureIdParamSchema),
  driverSalaryStructureController.remove
);

export default router;
