import { Router } from 'express';
import { businessRuleController } from '../controllers/business-rule.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listBusinessRulesSchema,
  businessRuleIdParamSchema,
  createBusinessRuleSchema,
  updateBusinessRuleSchema,
} from '../validators/business-rule.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('business_rule.view'), validate(listBusinessRulesSchema), businessRuleController.list);
router.post('/', authorize('business_rule.create'), validate(createBusinessRuleSchema), businessRuleController.create);
router.patch('/:id', authorize('business_rule.edit'), validate(updateBusinessRuleSchema), businessRuleController.update);
router.delete('/:id', authorize('business_rule.delete'), validate(businessRuleIdParamSchema), businessRuleController.remove);

export default router;
