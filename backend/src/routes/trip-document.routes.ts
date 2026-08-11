import { Router } from 'express';
import { tripDocumentController } from '../controllers/trip-document.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  uploadTripDocumentSchema,
  verifyTripDocumentSchema,
  tripDocumentIdParamSchema,
} from '../validators/trip-document.validator';
import { uploadTripDocument } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('trip.view'), tripDocumentController.list);
router.post(
  '/',
  authorize('pod.upload'),
  uploadTripDocument,
  validate(uploadTripDocumentSchema),
  tripDocumentController.upload
);
router.patch(
  '/:id/verify',
  authorize('pod.verify'),
  validate(verifyTripDocumentSchema),
  tripDocumentController.verify
);

export default router;
