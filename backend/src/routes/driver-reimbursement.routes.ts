import { Router } from 'express';
import { driverReimbursementController } from '../controllers/driver-reimbursement.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listDriverReimbursementsSchema,
  driverReimbursementIdParamSchema,
  createDriverReimbursementSchema,
  rejectDriverReimbursementSchema,
} from '../validators/driver-reimbursement.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('driverReimbursement.view'), validate(listDriverReimbursementsSchema), driverReimbursementController.list);
router.get('/:id', authorize('driverReimbursement.view'), validate(driverReimbursementIdParamSchema), driverReimbursementController.getById);
router.post('/', authorize('driverReimbursement.create'), validate(createDriverReimbursementSchema), driverReimbursementController.request);
router.patch('/:id/approve', authorize('driverReimbursement.approve'), validate(driverReimbursementIdParamSchema), driverReimbursementController.approve);
router.patch('/:id/reject', authorize('driverReimbursement.approve'), validate(rejectDriverReimbursementSchema), driverReimbursementController.reject);
router.delete('/:id', authorize('driverReimbursement.delete'), validate(driverReimbursementIdParamSchema), driverReimbursementController.remove);

export default router;
