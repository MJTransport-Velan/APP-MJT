import { Router } from 'express';
import { adminDepartmentController } from '../controllers/admin-department.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentIdParamSchema,
} from '../validators/admin-department.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('department.view'), adminDepartmentController.list);
router.get('/:id', authorize('department.view'), validate(departmentIdParamSchema), adminDepartmentController.getById);
router.post('/', authorize('department.create'), validate(createDepartmentSchema), adminDepartmentController.create);
router.put('/:id', authorize('department.edit'), validate(updateDepartmentSchema), adminDepartmentController.update);
router.delete('/:id', authorize('department.delete'), validate(departmentIdParamSchema), adminDepartmentController.remove);

export default router;
