import { Router } from 'express';
import { driverSettlementController } from '../controllers/driver-settlement.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listDriverSettlementsSchema,
  driverSettlementIdParamSchema,
  createDriverSettlementSchema,
  previewDriverSettlementSchema,
} from '../validators/driver-settlement.validator';

const router = Router();
router.use(authenticate);

router.get('/preview', authorize('driverSettlement.view'), validate(previewDriverSettlementSchema), driverSettlementController.preview);
router.get('/', authorize('driverSettlement.view'), validate(listDriverSettlementsSchema), driverSettlementController.list);
router.get('/:id', authorize('driverSettlement.view'), validate(driverSettlementIdParamSchema), driverSettlementController.getById);
router.post('/', authorize('driverSettlement.create'), validate(createDriverSettlementSchema), driverSettlementController.create);
router.delete('/:id', authorize('driverSettlement.delete'), validate(driverSettlementIdParamSchema), driverSettlementController.remove);
router.patch('/:id/calculate', authorize('driverSettlement.create'), validate(driverSettlementIdParamSchema), driverSettlementController.calculate);
router.patch('/:id/approve', authorize('driverSettlement.approve'), validate(driverSettlementIdParamSchema), driverSettlementController.approve);
router.patch('/:id/pay', authorize('driverSettlement.pay'), validate(driverSettlementIdParamSchema), driverSettlementController.pay);
router.patch('/:id/revert', authorize('driverSettlement.create'), validate(driverSettlementIdParamSchema), driverSettlementController.revertToDraft);

export default router;
