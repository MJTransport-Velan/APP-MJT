import { Router } from 'express';
import { vehicleAssignmentController } from '../controllers/vehicle-assignment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createAssignmentSchema,
  assignmentIdParamSchema,
  completeAssignmentSchema,
  updateAssignmentSchema,
} from '../validators/vehicle-assignment.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('vehicle.view'), vehicleAssignmentController.list);
router.get('/:id', authorize('vehicle.view'), validate(assignmentIdParamSchema), vehicleAssignmentController.getById);
router.post('/', authorize('vehicle.assign'), validate(createAssignmentSchema), vehicleAssignmentController.create);
router.patch(
  '/:id/complete',
  authorize('vehicle.assign'),
  validate(completeAssignmentSchema),
  vehicleAssignmentController.complete
);
router.patch(
  '/:id/cancel',
  authorize('vehicle.assign'),
  validate(assignmentIdParamSchema),
  vehicleAssignmentController.cancel
);
router.patch(
  '/:id',
  authorize('vehicle.assign'),
  validate(updateAssignmentSchema),
  vehicleAssignmentController.update
);
router.delete(
  '/:id',
  authorize('vehicle.assign'),
  validate(assignmentIdParamSchema),
  vehicleAssignmentController.remove
);

export default router;
