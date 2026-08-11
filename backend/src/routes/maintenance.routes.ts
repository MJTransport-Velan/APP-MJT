import { Router } from 'express';
import { maintenanceController } from '../controllers/maintenance.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  maintenanceIdParamSchema,
} from '../validators/maintenance.validator';
import { uploadMaintenanceAttachment } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('maintenance.view'), maintenanceController.list);
router.get('/upcoming-due', authorize('maintenance.view'), maintenanceController.upcomingDue);
router.get('/:id', authorize('maintenance.view'), validate(maintenanceIdParamSchema), maintenanceController.getById);
router.post('/', authorize('maintenance.create'), validate(createMaintenanceSchema), maintenanceController.create);
router.put('/:id', authorize('maintenance.edit'), validate(updateMaintenanceSchema), maintenanceController.update);
router.post(
  '/:id/bill',
  authorize('maintenance.edit'),
  validate(maintenanceIdParamSchema),
  uploadMaintenanceAttachment,
  maintenanceController.uploadBill
);
router.post(
  '/:id/accident-photo',
  authorize('maintenance.edit'),
  validate(maintenanceIdParamSchema),
  uploadMaintenanceAttachment,
  maintenanceController.uploadAccidentPhoto
);
router.delete(
  '/:id',
  authorize('maintenance.delete'),
  validate(maintenanceIdParamSchema),
  maintenanceController.remove
);

export default router;
