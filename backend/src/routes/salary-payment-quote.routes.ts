import { Router } from 'express';
import { salaryPaymentQuoteController } from '../controllers/salary-payment-quote.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { employeeSalaryQuoteSchema, driverSalaryQuoteSchema } from '../validators/salary-payment-quote.validator';

const router = Router();
router.use(authenticate);

router.get('/employee/:employeeId', authorize('salaryStructure.view'), validate(employeeSalaryQuoteSchema), salaryPaymentQuoteController.employeeQuote);
router.get('/driver/:driverId', authorize('driverSalaryStructure.view'), validate(driverSalaryQuoteSchema), salaryPaymentQuoteController.driverQuote);

export default router;
