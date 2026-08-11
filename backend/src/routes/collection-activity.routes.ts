import { Router } from 'express';
import { z } from 'zod';
import { collectionActivityController } from '../controllers/collection-activity.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createCollectionActivitySchema, listCollectionActivitiesSchema } from '../validators/collection-activity.validator';

const router = Router();
router.use(authenticate);

const upcomingQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ days: z.string().optional() }),
});

router.get('/', authorize('collectionActivity.view'), validate(listCollectionActivitiesSchema), collectionActivityController.list);
router.get('/upcoming', authorize('collectionActivity.view'), validate(upcomingQuerySchema), collectionActivityController.upcoming);
router.post('/', authorize('collectionActivity.create'), validate(createCollectionActivitySchema), collectionActivityController.create);

export default router;
