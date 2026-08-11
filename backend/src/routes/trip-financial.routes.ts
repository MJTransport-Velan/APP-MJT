import { Router } from 'express';
import { tripFinancialController } from '../controllers/trip-financial.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();
router.use(authenticate, authorize('tripFinancial.view'));

router.get('/vehicle-wise', tripFinancialController.vehicleWise);
router.get('/supplier-wise', tripFinancialController.supplierWise);
router.get('/customer-wise', tripFinancialController.customerWise);
router.get('/:tripId', tripFinancialController.getForTrip);

export default router;
