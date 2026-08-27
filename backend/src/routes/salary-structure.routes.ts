import { Router } from 'express';
import { salaryStructureController } from '../controllers/salary-structure.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  employeeIdParamSchema,
  salaryStructureIdParamSchema,
  createSalaryStructureSchema,
  updateSalaryStructureSchema,
} from '../validators/salary-structure.validator';

const router = Router();
router.use(authenticate);

router.get('/employee/:employeeId', authorize('salaryStructure.view'), validate(employeeIdParamSchema), salaryStructureController.listForEmployee);
router.get('/employee/:employeeId/active', authorize('salaryStructure.view'), validate(employeeIdParamSchema), salaryStructureController.getActiveForEmployee);
router.get('/:id', authorize('salaryStructure.view'), validate(salaryStructureIdParamSchema), salaryStructureController.getById);
router.post('/', authorize('salaryStructure.create'), validate(createSalaryStructureSchema), salaryStructureController.create);
router.put('/:id', authorize('salaryStructure.edit'), validate(updateSalaryStructureSchema), salaryStructureController.update);
router.delete('/:id', authorize('salaryStructure.delete'), validate(salaryStructureIdParamSchema), salaryStructureController.remove);

export default router;
