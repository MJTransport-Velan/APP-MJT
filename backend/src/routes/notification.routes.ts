import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import {
  dueRemindersSchema,
  listNotificationsSchema,
  notificationIdParamSchema,
  runDueReminderScanSchema,
} from '../validators/notification.validator';

const router = Router();
router.use(authenticate);

router.get('/', validate(listNotificationsSchema), notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.get('/templates', notificationController.listTemplates);
// No authorize() on the list: the service already filters it down to the
// kinds the caller holds a permission for.
router.get('/due-reminders', validate(dueRemindersSchema), notificationController.dueReminders);
router.post(
  '/due-reminders/scan',
  authorize('automation_rule.manage'),
  validate(runDueReminderScanSchema),
  notificationController.runDueReminderScan,
);
router.patch('/:id/read', validate(notificationIdParamSchema), notificationController.markRead);
router.patch('/mark-all-read', notificationController.markAllRead);

export default router;
