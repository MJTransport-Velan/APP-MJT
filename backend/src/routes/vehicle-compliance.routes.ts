import { Router } from 'express';
import { vehicleComplianceController } from '../controllers/vehicle-compliance.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listComplianceRecordsSchema,
  expiringComplianceSchema,
  complianceRecordIdParamSchema,
  createComplianceRecordSchema,
  fileClaimSchema,
  settleClaimSchema,
} from '../validators/vehicle-compliance.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('vehicle_compliance.view'), validate(listComplianceRecordsSchema), vehicleComplianceController.list);
router.get('/expiring', authorize('vehicle_compliance.view'), validate(expiringComplianceSchema), vehicleComplianceController.expiringWithin);
router.get('/:id', authorize('vehicle_compliance.view'), validate(complianceRecordIdParamSchema), vehicleComplianceController.getById);
router.post('/', authorize('vehicle_compliance.create'), validate(createComplianceRecordSchema), vehicleComplianceController.create);
router.post('/:id/claims', authorize('vehicle_compliance.edit'), validate(fileClaimSchema), vehicleComplianceController.fileClaim);
router.patch('/claims/:claimId', authorize('vehicle_compliance.edit'), validate(settleClaimSchema), vehicleComplianceController.settleClaim);

export default router;
