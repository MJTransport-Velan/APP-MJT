import { Router } from 'express';
import { driverController } from '../controllers/driver.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createDriverSchema, updateDriverSchema, driverIdParamSchema } from '../validators/driver.validator';
import { uploadDriverLicense } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('driver.view'), driverController.list);
router.get('/:id', authorize('driver.view'), validate(driverIdParamSchema), driverController.getById);
router.post('/', authorize('driver.create'), validate(createDriverSchema), driverController.create);
router.put('/:id', authorize('driver.edit'), validate(updateDriverSchema), driverController.update);
router.post(
  '/:id/license',
  authorize('driver.edit'),
  validate(driverIdParamSchema),
  uploadDriverLicense,
  driverController.uploadLicense
);
router.patch('/:id/status', authorize('driver.edit'), validate(driverIdParamSchema), driverController.toggleStatus);
router.delete('/:id', authorize('driver.delete'), validate(driverIdParamSchema), driverController.remove);

export default router;
