import { Router } from 'express';
import { driverEarningController } from '../controllers/driver-earning.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listDriverEarningsSchema,
  driverEarningIdParamSchema,
  createDriverEarningSchema,
  rejectDriverEarningSchema,
  createDriverEarningRuleSchema,
  updateDriverEarningRuleSchema,
  driverEarningRuleIdParamSchema,
} from '../validators/driver-earning.validator';

const router = Router();
router.use(authenticate);

router.get('/rules', authorize('driverEarningRule.view'), driverEarningController.listRules);
router.post('/rules', authorize('driverEarningRule.create'), validate(createDriverEarningRuleSchema), driverEarningController.createRule);
router.put('/rules/:id', authorize('driverEarningRule.edit'), validate(updateDriverEarningRuleSchema), driverEarningController.updateRule);
router.delete('/rules/:id', authorize('driverEarningRule.delete'), validate(driverEarningRuleIdParamSchema), driverEarningController.removeRule);

router.get('/', authorize('driverEarning.view'), validate(listDriverEarningsSchema), driverEarningController.list);
router.get('/:id', authorize('driverEarning.view'), validate(driverEarningIdParamSchema), driverEarningController.getById);
router.post('/', authorize('driverEarning.create'), validate(createDriverEarningSchema), driverEarningController.create);
router.patch('/:id/approve', authorize('driverEarning.approve'), validate(driverEarningIdParamSchema), driverEarningController.approve);
router.patch('/:id/reject', authorize('driverEarning.approve'), validate(rejectDriverEarningSchema), driverEarningController.reject);
router.delete('/:id', authorize('driverEarning.delete'), validate(driverEarningIdParamSchema), driverEarningController.remove);

export default router;
