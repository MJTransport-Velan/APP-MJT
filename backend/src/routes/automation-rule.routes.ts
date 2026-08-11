import { Router } from 'express';
import { automationRuleController } from '../controllers/automation-rule.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
  automationRuleIdParamSchema,
  listRunLogsSchema,
  fireEventSchema,
} from '../validators/automation-rule.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('automation_rule.view'), automationRuleController.list);
router.post('/', authorize('automation_rule.manage'), validate(createAutomationRuleSchema), automationRuleController.create);
router.patch('/:id', authorize('automation_rule.manage'), validate(updateAutomationRuleSchema), automationRuleController.update);
router.delete('/:id', authorize('automation_rule.manage'), validate(automationRuleIdParamSchema), automationRuleController.remove);
router.post('/:id/run', authorize('automation_rule.manage'), validate(automationRuleIdParamSchema), automationRuleController.runNow);
router.get('/:id/run-logs', authorize('automation_rule.view'), validate(listRunLogsSchema), automationRuleController.runLogs);
router.post('/fire-event', authorize('automation_rule.manage'), validate(fireEventSchema), automationRuleController.fireEvent);

export default router;
