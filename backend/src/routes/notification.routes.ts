import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listNotificationsSchema, notificationIdParamSchema } from '../validators/notification.validator';

const router = Router();
router.use(authenticate);

router.get('/', validate(listNotificationsSchema), notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.get('/templates', notificationController.listTemplates);
router.patch('/:id/read', validate(notificationIdParamSchema), notificationController.markRead);
router.patch('/mark-all-read', notificationController.markAllRead);

export default router;
