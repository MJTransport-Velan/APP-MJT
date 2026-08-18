import { Router } from 'express';
import { driverSalaryPaymentController } from '../controllers/driver-salary-payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { driverIdParamSchema } from '../validators/driver-salary-structure.validator';

const router = Router();
router.use(authenticate);

router.get('/:driverId', authorize('driverSalaryStructure.view'), validate(driverIdParamSchema), driverSalaryPaymentController.listForDriver);

export default router;
