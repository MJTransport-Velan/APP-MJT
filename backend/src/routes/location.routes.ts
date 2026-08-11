import { Router } from 'express';
import { locationController } from '../controllers/location.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createLocationSchema, updateLocationSchema, locationIdParamSchema } from '../validators/location.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('location.view'), locationController.list);
router.get('/:id', authorize('location.view'), validate(locationIdParamSchema), locationController.getById);
router.post('/', authorize('location.create'), validate(createLocationSchema), locationController.create);
router.put('/:id', authorize('location.edit'), validate(updateLocationSchema), locationController.update);
router.patch('/:id/status', authorize('location.edit'), validate(locationIdParamSchema), locationController.toggleStatus);
router.delete('/:id', authorize('location.delete'), validate(locationIdParamSchema), locationController.remove);

export default router;
