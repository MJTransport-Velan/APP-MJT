import { Router } from 'express';
import { z } from 'zod';
import { arApOutstandingController } from '../controllers/ar-ap-outstanding.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();
router.use(authenticate);

const idParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid id') }),
});
router.get('/customers/:id/outstanding', authorize('invoice.view'), validate(idParamSchema), arApOutstandingController.customerOutstanding);
router.get('/customers/aging', authorize('invoice.view'), arApOutstandingController.customerAging);
router.get('/customers/summary', authorize('invoice.view'), arApOutstandingController.customerSummary);
router.get('/suppliers/:id/outstanding', authorize('supplierBill.view'), validate(idParamSchema), arApOutstandingController.supplierOutstanding);
router.get('/suppliers/aging', authorize('supplierBill.view'), arApOutstandingController.supplierAging);
router.get('/suppliers/summary', authorize('supplierBill.view'), arApOutstandingController.supplierSummary);

export default router;
