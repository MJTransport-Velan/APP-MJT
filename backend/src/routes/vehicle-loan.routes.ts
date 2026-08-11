import { Router } from 'express';
import { vehicleLoanController } from '../controllers/vehicle-loan.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listVehicleLoansSchema,
  vehicleLoanIdParamSchema,
  createVehicleLoanSchema,
  rejectVehicleLoanSchema,
  createDisbursementSchema,
  payInstallmentSchema,
  forecloseSchema,
} from '../validators/vehicle-loan.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('vehicle_loan.view'), validate(listVehicleLoansSchema), vehicleLoanController.list);
router.get('/:id', authorize('vehicle_loan.view'), validate(vehicleLoanIdParamSchema), vehicleLoanController.getById);
router.post('/', authorize('vehicle_loan.create'), validate(createVehicleLoanSchema), vehicleLoanController.request);
router.patch('/:id/approve', authorize('vehicle_loan.approve'), validate(vehicleLoanIdParamSchema), vehicleLoanController.approve);
router.patch('/:id/reject', authorize('vehicle_loan.approve'), validate(rejectVehicleLoanSchema), vehicleLoanController.reject);
router.post('/:id/disbursements', authorize('vehicle_loan.approve'), validate(createDisbursementSchema), vehicleLoanController.disburse);
router.patch('/:id/installments/:installmentId/pay', authorize('vehicle_loan.pay'), validate(payInstallmentSchema), vehicleLoanController.payInstallment);
router.patch('/:id/foreclose', authorize('vehicle_loan.pay'), validate(forecloseSchema), vehicleLoanController.foreclose);
router.delete('/:id', authorize('vehicle_loan.delete'), validate(vehicleLoanIdParamSchema), vehicleLoanController.remove);

export default router;
