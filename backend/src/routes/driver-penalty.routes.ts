import { Router } from 'express';
import { driverPenaltyController } from '../controllers/driver-penalty.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listDriverPenaltiesSchema,
  driverPenaltyIdParamSchema,
  createDriverPenaltySchema,
  rejectDriverPenaltySchema,
} from '../validators/driver-penalty.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('driverPenalty.view'), validate(listDriverPenaltiesSchema), driverPenaltyController.list);
router.get('/:id', authorize('driverPenalty.view'), validate(driverPenaltyIdParamSchema), driverPenaltyController.getById);
router.post('/', authorize('driverPenalty.create'), validate(createDriverPenaltySchema), driverPenaltyController.request);
router.patch('/:id/approve', authorize('driverPenalty.approve'), validate(driverPenaltyIdParamSchema), driverPenaltyController.approve);
router.patch('/:id/reject', authorize('driverPenalty.approve'), validate(rejectDriverPenaltySchema), driverPenaltyController.reject);
router.delete('/:id', authorize('driverPenalty.delete'), validate(driverPenaltyIdParamSchema), driverPenaltyController.remove);

export default router;
