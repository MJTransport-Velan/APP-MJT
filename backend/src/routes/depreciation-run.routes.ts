import { Router } from 'express';
import { depreciationRunController } from '../controllers/depreciation-run.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listDepreciationRunsSchema, depreciationRunIdParamSchema, createDepreciationRunSchema } from '../validators/depreciation-run.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('depreciation.view'), validate(listDepreciationRunsSchema), depreciationRunController.list);
router.get('/:id', authorize('depreciation.view'), validate(depreciationRunIdParamSchema), depreciationRunController.getById);
router.post('/', authorize('depreciation.create'), validate(createDepreciationRunSchema), depreciationRunController.create);
router.post('/:id/calculate', authorize('depreciation.create'), validate(depreciationRunIdParamSchema), depreciationRunController.calculate);
router.patch('/:id/approve', authorize('depreciation.approve'), validate(depreciationRunIdParamSchema), depreciationRunController.approve);

export default router;
