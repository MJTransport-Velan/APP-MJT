import { Router } from 'express';
import { z } from 'zod';
import { financialStateController } from '../controllers/financial-state.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';

const idParam = (name: string) =>
  z.object({ body: z.object({}).optional(), query: z.object({}).optional(), params: z.object({ [name]: z.string().uuid(`Invalid ${name}`) }) });

const dashboardQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ from: z.string().optional(), to: z.string().optional() }),
});

const bankCashQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ organizationId: z.string().uuid().optional() }),
});

const router = Router();
router.use(authenticate);

router.get('/dashboard', authorize('financialState.view'), validate(dashboardQuerySchema), financialStateController.dashboard);
router.get('/bank-cash', authorize('financialState.view'), validate(bankCashQuerySchema), financialStateController.bankAndCash);
router.get('/customer/:companyId', authorize('financialState.view'), validate(idParam('companyId')), financialStateController.customer);
router.get('/supplier/:supplierId', authorize('financialState.view'), validate(idParam('supplierId')), financialStateController.supplier);
router.get('/driver/:driverId', authorize('financialState.view'), validate(idParam('driverId')), financialStateController.driver);
router.get('/vehicle/:vehicleId', authorize('financialState.view'), validate(idParam('vehicleId')), financialStateController.vehicle);
router.get('/employee/:employeeId', authorize('financialState.view'), validate(idParam('employeeId')), financialStateController.employee);

export default router;
