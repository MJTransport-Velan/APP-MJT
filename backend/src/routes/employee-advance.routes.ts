import { Router } from 'express';
import { employeeAdvanceController } from '../controllers/employee-advance.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listEmployeeAdvancesSchema,
  employeeAdvanceIdParamSchema,
  createEmployeeAdvanceSchema,
  rejectEmployeeAdvanceSchema,
} from '../validators/employee-advance.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('employeeAdvance.view'), validate(listEmployeeAdvancesSchema), employeeAdvanceController.list);
router.get('/:id', authorize('employeeAdvance.view'), validate(employeeAdvanceIdParamSchema), employeeAdvanceController.getById);
router.post('/', authorize('employeeAdvance.create'), validate(createEmployeeAdvanceSchema), employeeAdvanceController.request);
router.patch('/:id/approve', authorize('employeeAdvance.approve'), validate(employeeAdvanceIdParamSchema), employeeAdvanceController.approve);
router.patch('/:id/reject', authorize('employeeAdvance.approve'), validate(rejectEmployeeAdvanceSchema), employeeAdvanceController.reject);
router.delete('/:id', authorize('employeeAdvance.delete'), validate(employeeAdvanceIdParamSchema), employeeAdvanceController.remove);

export default router;
