import { Router } from 'express';
import { sparePartUsageController } from '../controllers/spare-part-usage.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUsageSchema, usageIdParamSchema } from '../validators/spare-part-usage.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('spare_part_usage.view'), sparePartUsageController.list);
router.get(
  '/:id',
  authorize('spare_part_usage.view'),
  validate(usageIdParamSchema),
  sparePartUsageController.getById
);
router.post('/', authorize('spare_part_usage.create'), validate(createUsageSchema), sparePartUsageController.create);

export default router;
