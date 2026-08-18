import { Router } from 'express';
import { employeeSalaryPaymentController } from '../controllers/employee-salary-payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { employeeIdParamSchema } from '../validators/salary-structure.validator';

const router = Router();
router.use(authenticate);

router.get('/employee/:employeeId', authorize('salaryStructure.view'), validate(employeeIdParamSchema), employeeSalaryPaymentController.listForEmployee);

export default router;
