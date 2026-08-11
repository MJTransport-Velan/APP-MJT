import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createWebhookSubscriptionSchema,
  updateWebhookSubscriptionSchema,
  webhookSubscriptionIdParamSchema,
  listWebhookDeliveriesSchema,
} from '../validators/webhook.validator';

const router = Router();
router.use(authenticate);

router.get('/subscriptions', authorize('webhook.view'), webhookController.list);
router.post('/subscriptions', authorize('webhook.manage'), validate(createWebhookSubscriptionSchema), webhookController.create);
router.patch('/subscriptions/:id', authorize('webhook.manage'), validate(updateWebhookSubscriptionSchema), webhookController.update);
router.delete('/subscriptions/:id', authorize('webhook.manage'), validate(webhookSubscriptionIdParamSchema), webhookController.remove);
router.post('/subscriptions/:id/test', authorize('webhook.manage'), validate(webhookSubscriptionIdParamSchema), webhookController.test);
router.get('/deliveries', authorize('webhook.view'), validate(listWebhookDeliveriesSchema), webhookController.deliveries);

export default router;
