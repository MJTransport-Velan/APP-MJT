import { Router } from 'express';
import { tripController } from '../controllers/trip.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createTripSchema,
  updateTripSchema,
  tripIdParamSchema,
  assignTripSchema,
  allocateAssetSchema,
  updateTripStatusSchema,
  cancelTripSchema,
  availableResourcesSchema,
} from '../validators/trip.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('trip.view'), tripController.list);
router.get('/stats', authorize('trip.view'), tripController.stats);
router.get(
  '/available-resources',
  authorize('trip.assign'),
  validate(availableResourcesSchema),
  tripController.availableResources
);
router.get('/:id', authorize('trip.view'), validate(tripIdParamSchema), tripController.getById);
router.get('/:id/timeline', authorize('trip.view'), validate(tripIdParamSchema), tripController.timeline);
router.post('/', authorize('trip.create'), validate(createTripSchema), tripController.create);
router.put('/:id', authorize('trip.edit'), validate(updateTripSchema), tripController.update);
router.patch('/:id/assign', authorize('trip.assign'), validate(assignTripSchema), tripController.assign);
router.patch('/:id/allocate', authorize('trip.assign'), validate(allocateAssetSchema), tripController.allocate);
router.patch('/:id/status', authorize('trip.track'), validate(updateTripStatusSchema), tripController.updateStatus);
router.patch('/:id/start', authorize('trip.start'), validate(tripIdParamSchema), tripController.start);
router.patch('/:id/complete', authorize('trip.complete'), validate(tripIdParamSchema), tripController.complete);
router.patch('/:id/cancel', authorize('trip.cancel'), validate(cancelTripSchema), tripController.cancel);
router.delete('/:id', authorize('trip.delete'), validate(tripIdParamSchema), tripController.remove);

export default router;
