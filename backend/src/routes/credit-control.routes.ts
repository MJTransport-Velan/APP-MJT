import { Router } from 'express';
import { creditControlController } from '../controllers/credit-control.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { companyIdParamSchema, setCreditControlSchema } from '../validators/credit-control.validator';

const router = Router();
router.use(authenticate);

router.get('/:id/credit-control', authorize('invoice.view'), validate(companyIdParamSchema), creditControlController.get);
router.put('/:id/credit-control', authorize('invoice.override_credit_hold'), validate(setCreditControlSchema), creditControlController.set);

export default router;
