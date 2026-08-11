import { Router } from 'express';
import { driverAdvanceController } from '../controllers/driver-advance.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listDriverAdvancesSchema,
  driverAdvanceIdParamSchema,
  createDriverAdvanceSchema,
  rejectDriverAdvanceSchema,
} from '../validators/driver-advance.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('driverAdvance.view'), validate(listDriverAdvancesSchema), driverAdvanceController.list);
router.get('/:id', authorize('driverAdvance.view'), validate(driverAdvanceIdParamSchema), driverAdvanceController.getById);
router.post('/', authorize('driverAdvance.create'), validate(createDriverAdvanceSchema), driverAdvanceController.request);
router.patch('/:id/approve', authorize('driverAdvance.approve'), validate(driverAdvanceIdParamSchema), driverAdvanceController.approve);
router.patch('/:id/reject', authorize('driverAdvance.approve'), validate(rejectDriverAdvanceSchema), driverAdvanceController.reject);
router.delete('/:id', authorize('driverAdvance.delete'), validate(driverAdvanceIdParamSchema), driverAdvanceController.remove);

export default router;
