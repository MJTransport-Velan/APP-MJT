import { Router } from 'express';
import { intentController } from '../controllers/intent.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createIntentSchema,
  updateIntentSchema,
  intentIdParamSchema,
  approveIntentSchema,
  rejectIntentSchema,
  cancelIntentSchema,
} from '../validators/intent.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('intent.view'), intentController.list);
router.get('/stats', authorize('intent.view'), intentController.stats);
router.get('/:id', authorize('intent.view'), validate(intentIdParamSchema), intentController.getById);
router.post('/', authorize('intent.create'), validate(createIntentSchema), intentController.create);
router.put('/:id', authorize('intent.edit'), validate(updateIntentSchema), intentController.update);
router.patch('/:id/submit', authorize('intent.edit'), validate(intentIdParamSchema), intentController.submit);
router.patch('/:id/approve', authorize('intent.approve'), validate(approveIntentSchema), intentController.approve);
router.patch('/:id/reject', authorize('intent.reject'), validate(rejectIntentSchema), intentController.reject);
router.patch('/:id/cancel', authorize('intent.cancel'), validate(cancelIntentSchema), intentController.cancel);
router.delete('/:id', authorize('intent.delete'), validate(intentIdParamSchema), intentController.remove);

export default router;
